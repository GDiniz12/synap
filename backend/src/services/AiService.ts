import { GoogleGenAI } from '@google/genai';
import { prisma } from '../config/prisma';
import { Response } from 'express';

export class AiService {
  private getApiKey(): string {
    const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!key || key.trim() === '') {
      throw new Error(
        'A chave de API do Google AI Studio não foi encontrada. Configure GEMINI_API_KEY no arquivo .env do backend.'
      );
    }
    return key.trim();
  }

  private getClient(): GoogleGenAI {
    const apiKey = this.getApiKey();
    return new GoogleGenAI({ apiKey });
  }

  // --- THREAD MANAGEMENT ---

  async getThreads(workspaceId: string) {
    return prisma.aiChatThread.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: {
          select: { mensagens: true },
        },
      },
    });
  }

  async createThread(workspaceId: string, titulo?: string) {
    return prisma.aiChatThread.create({
      data: {
        workspaceId,
        titulo: titulo?.trim() || 'Nova conversa de estudos',
      },
    });
  }

  async getThreadById(threadId: string) {
    return prisma.aiChatThread.findUnique({
      where: { id: threadId },
      include: {
        mensagens: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async updateThreadTitle(threadId: string, titulo: string) {
    return prisma.aiChatThread.update({
      where: { id: threadId },
      data: { titulo },
    });
  }

  async deleteThread(threadId: string) {
    return prisma.aiChatThread.delete({
      where: { id: threadId },
    });
  }

  // --- CHAT STREAMING & TOOL EXECUTION ---

  async streamChat({
    workspaceId,
    threadId,
    userMessage,
    activeNote,
    res,
  }: {
    workspaceId: string;
    threadId: string;
    userMessage: string;
    activeNote?: { id: string; titulo: string; conteudo?: string } | null;
    res: Response;
  }) {
    // 1. Verify thread exists
    const thread = await prisma.aiChatThread.findUnique({
      where: { id: threadId },
      include: {
        mensagens: {
          orderBy: { createdAt: 'asc' },
          take: 30, // keep the last 30 messages for context
        },
      },
    });

    if (!thread || thread.workspaceId !== workspaceId) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Thread não encontrada neste workspace.' })}\n\n`);
      res.end();
      return;
    }

    // 2. Save user message to database
    await prisma.aiChatMessage.create({
      data: {
        threadId,
        role: 'user',
        conteudo: userMessage,
        metadata: activeNote ? { activeNoteId: activeNote.id, activeNoteTitle: activeNote.titulo } : undefined,
      },
    });

    // Auto-update thread title if it's default
    if (thread.titulo === 'Nova conversa de estudos' || thread.titulo === 'Nova conversa') {
      const generatedTitle = userMessage.slice(0, 45) + (userMessage.length > 45 ? '...' : '');
      await prisma.aiChatThread.update({
        where: { id: threadId },
        data: { titulo: generatedTitle },
      });
    }

    // 3. Initialize Google GenAI Client
    let ai: GoogleGenAI;
    try {
      ai = this.getClient();
    } catch (err: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
      return;
    }

    // 4. Build tools declarations
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'search_workspace_notes',
            description: 'Pesquisa e lista notas existentes no espaço de trabalho (workspace) do usuário pelo título ou conteúdo.',
            parameters: {
              type: 'OBJECT',
              properties: {
                query: {
                  type: 'STRING',
                  description: 'Termo de busca para encontrar notas relevantes. Deixe vazio para listar as notas mais recentes.',
                },
              },
            },
          },
          {
            name: 'get_note_details',
            description: 'Obtém o conteúdo completo e detalhes de uma nota específica pelo ID.',
            parameters: {
              type: 'OBJECT',
              properties: {
                noteId: {
                  type: 'STRING',
                  description: 'O ID único da nota a ser lida.',
                },
              },
              required: ['noteId'],
            },
          },
          {
            name: 'create_new_note',
            description: 'Cria uma nova nota de texto ou resumo de estudos no espaço de trabalho.',
            parameters: {
              type: 'OBJECT',
              properties: {
                title: {
                  type: 'STRING',
                  description: 'Título claro e descritivo da nova nota.',
                },
                content: {
                  type: 'STRING',
                  description: 'Conteúdo formatado em Markdown com títulos, listas e explicações.',
                },
                folderId: {
                  type: 'STRING',
                  description: 'ID opcional da pasta onde a nota deve ser salva.',
                },
              },
              required: ['title', 'content'],
            },
          },
          {
            name: 'update_active_note',
            description: 'Atualiza ou adiciona conteúdo à nota atualmente aberta pelo usuário.',
            parameters: {
              type: 'OBJECT',
              properties: {
                noteId: {
                  type: 'STRING',
                  description: 'ID da nota que está sendo atualizada.',
                },
                content: {
                  type: 'STRING',
                  description: 'O novo conteúdo completo da nota em Markdown.',
                },
                title: {
                  type: 'STRING',
                  description: 'Novo título opcional para a nota.',
                },
              },
              required: ['noteId', 'content'],
            },
          },
          {
            name: 'create_flashcards_deck',
            description: 'Cria um novo baralho (deck) de flashcards com perguntas e respostas para repetição espaçada (SM-2).',
            parameters: {
              type: 'OBJECT',
              properties: {
                deckTitle: {
                  type: 'STRING',
                  description: 'Nome do baralho de flashcards (ex: "História Medieval", "Cálculo I: Derivadas").',
                },
                description: {
                  type: 'STRING',
                  description: 'Breve descrição do conteúdo coberto.',
                },
                cards: {
                  type: 'ARRAY',
                  description: 'Lista de flashcards a serem criados.',
                  items: {
                    type: 'OBJECT',
                    properties: {
                      front: {
                        type: 'STRING',
                        description: 'Pergunta, conceito ou estímulo no lado da frente do cartão.',
                      },
                      back: {
                        type: 'STRING',
                        description: 'Resposta concisa, explicação ou resolução no verso do cartão.',
                      },
                    },
                    required: ['front', 'back'],
                  },
                },
              },
              required: ['deckTitle', 'cards'],
            },
          },
        ],
      },
    ];

    // 5. Build system instructions with context
    let systemInstruction = `Você é o Synap AI, o assistente inteligente de estudos e gestão de conhecimento da plataforma Synap.
Sua missão é ajudar o usuário a aprender de forma profunda e estruturada, analisar suas anotações, sintetizar conceitos difíceis, responder dúvidas, criar novas notas de estudo e gerar flashcards eficazes para memorização ativa (repetição espaçada).

Diretrizes de resposta:
- Responda sempre em Português (ou no idioma da pergunta do usuário).
- Seja claro, didático, objetivo e elegante.
- Use formatação Markdown rica (títulos ##, listas, negrito, tabelas).
- Para fórmulas matemáticas e científicas, use notação LaTeX entre $...$ (inline) ou $$...$$ (bloco).
- Para código de programação, utilize blocos com a linguagem indicada (ex: \`\`\`typescript ... \`\`\`).
- Quando solicitado para criar notas ou flashcards, execute as ferramentas apropriadas (create_new_note, create_flashcards_deck, update_active_note). Sempre informe ao usuário o que foi criado de maneira amigável.
`;

    if (activeNote) {
      systemInstruction += `\n\n--- CONTEXTO DA NOTA ATUALMENTE ABERTA NO EDITOR ---
Título: "${activeNote.titulo}"
ID da Nota: "${activeNote.id}"
Conteúdo Atual:
${activeNote.conteudo ? activeNote.conteudo.slice(0, 10000) : '(Nota vazia)'}
--- FIM DO CONTEXTO DA NOTA ATUAL ---
O usuário está visualizando/editando esta nota agora. Se ele pedir para resumir, gerar cartões ou complementar a nota, use este contexto diretamente.`;
    }

    // 6. Build conversation contents for Gemini
    const contents: Array<any> = [];

    // Add prior history
    for (const msg of thread.mensagens) {
      if (msg.role === 'user') {
        contents.push({
          role: 'user',
          parts: [{ text: msg.conteudo }],
        });
      } else if (msg.role === 'assistant') {
        contents.push({
          role: 'model',
          parts: [{ text: msg.conteudo }],
        });
      }
    }

    // Add current user message
    contents.push({
      role: 'user',
      parts: [{ text: userMessage }],
    });

    const createdEntities: {
      notesCreated: Array<{ id: string; titulo: string }>;
      notesUpdated: Array<{ id: string; titulo?: string }>;
      decksCreated: Array<{ id: string; nome: string; count: number }>;
    } = {
      notesCreated: [],
      notesUpdated: [],
      decksCreated: [],
    };

    let assistantFullText = '';

    try {
      // Execute multi-step loop if model calls tools
      let continueLoop = true;
      let loopCount = 0;
      const MAX_LOOPS = 5;

      while (continueLoop && loopCount < MAX_LOOPS) {
        loopCount++;

        const modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

        const responseStream = await ai.models.generateContentStream({
          model: modelName,
          contents,
          config: {
            systemInstruction,
            tools: tools as any,
            temperature: 0.7,
          },
        });

        let currentTurnText = '';
        let functionCallsToExecute: any[] = [];

        for await (const chunk of responseStream) {
          // Check for text content
          if (chunk.text) {
            currentTurnText += chunk.text;
            assistantFullText += chunk.text;
            res.write(`event: delta\ndata: ${JSON.stringify({ text: chunk.text })}\n\n`);
          }

          // Check for function calls in chunk candidates
          const candidates = chunk.candidates || [];
          for (const cand of candidates) {
            const parts = cand.content?.parts || [];
            for (const part of parts) {
              if ((part as any).functionCall) {
                functionCallsToExecute.push((part as any).functionCall);
              }
            }
          }
        }

        if (functionCallsToExecute.length === 0) {
          // No tools called, we're done
          continueLoop = false;
          break;
        }

        // Model requested tool calls: Execute them!
        const modelParts: any[] = [];
        if (currentTurnText) {
          modelParts.push({ text: currentTurnText });
        }
        for (const fc of functionCallsToExecute) {
          modelParts.push({ functionCall: fc });
        }
        contents.push({ role: 'model', parts: modelParts });

        const functionResponses: any[] = [];

        for (const fc of functionCallsToExecute) {
          const fnName = fc.name;
          const fnArgs = fc.args || {};

          // Notify client about tool execution
          res.write(
            `event: tool_call\ndata: ${JSON.stringify({
              name: fnName,
              args: fnArgs,
            })}\n\n`
          );

          let result: any = {};

          try {
            if (fnName === 'search_workspace_notes') {
              const query = ((fnArgs as any).query || '').toLowerCase().trim();
              const notes = await prisma.nota.findMany({
                where: { workspaceId },
                select: { id: true, titulo: true, tipo: true, updatedAt: true, conteudo: true },
                orderBy: { updatedAt: 'desc' },
                take: 15,
              });

              const filtered = query
                ? notes.filter(
                    (n) =>
                      n.titulo.toLowerCase().includes(query) ||
                      (n.conteudo && n.conteudo.toLowerCase().includes(query))
                  )
                : notes;

              result = {
                notes: filtered.map((n) => ({
                  id: n.id,
                  title: n.titulo,
                  type: n.tipo,
                  excerpt: n.conteudo ? n.conteudo.slice(0, 300) : '',
                })),
              };
            } else if (fnName === 'get_note_details') {
              const note = await prisma.nota.findFirst({
                where: { id: (fnArgs as any).noteId, workspaceId },
              });
              if (note) {
                result = { note: { id: note.id, title: note.titulo, content: note.conteudo, type: note.tipo } };
              } else {
                result = { error: 'Nota não encontrada no workspace.' };
              }
            } else if (fnName === 'create_new_note') {
              const newNota = await prisma.nota.create({
                data: {
                  workspaceId,
                  titulo: (fnArgs as any).title,
                  conteudo: (fnArgs as any).content,
                  pastaId: (fnArgs as any).folderId || null,
                  tipo: 'texto',
                },
              });
              createdEntities.notesCreated.push({ id: newNota.id, titulo: newNota.titulo });
              result = { success: true, createdNote: { id: newNota.id, title: newNota.titulo } };
            } else if (fnName === 'update_active_note') {
              const updated = await prisma.nota.update({
                where: { id: (fnArgs as any).noteId },
                data: {
                  ...((fnArgs as any).title ? { titulo: (fnArgs as any).title } : {}),
                  conteudo: (fnArgs as any).content,
                },
              });
              createdEntities.notesUpdated.push({ id: updated.id, titulo: updated.titulo });
              result = { success: true, updatedNote: { id: updated.id, title: updated.titulo } };
            } else if (fnName === 'create_flashcards_deck') {
              const deck = await prisma.deck.create({
                data: {
                  workspaceId,
                  nome: (fnArgs as any).deckTitle,
                  descricao: (fnArgs as any).description || `Criado pela IA em ${new Date().toLocaleDateString('pt-BR')}`,
                },
              });

              const cardsData = ((fnArgs as any).cards || []).map((c: any) => ({
                deckId: deck.id,
                frente: c.front,
                verso: c.back,
                tipo: 'card',
              }));

              if (cardsData.length > 0) {
                await prisma.flashcard.createMany({
                  data: cardsData,
                });
              }

              createdEntities.decksCreated.push({
                id: deck.id,
                nome: deck.nome,
                count: cardsData.length,
              });

              result = {
                success: true,
                deck: { id: deck.id, title: deck.nome, totalCards: cardsData.length },
              };
            } else {
              result = { error: `Ferramenta desconhecida: ${fnName}` };
            }
          } catch (toolErr: any) {
            result = { error: toolErr.message || 'Erro ao executar ferramenta.' };
          }

          // Notify client about tool result
          res.write(
            `event: tool_result\ndata: ${JSON.stringify({
              name: fnName,
              result,
            })}\n\n`
          );

          functionResponses.push({
            functionResponse: {
              name: fnName,
              response: result,
            },
          });
        }

        // Add function responses to conversation
        contents.push({
          role: 'user',
          parts: functionResponses,
        });
      }

      // 7. Save assistant response to DB
      const savedAssistantMsg = await prisma.aiChatMessage.create({
        data: {
          threadId,
          role: 'assistant',
          conteudo: assistantFullText,
          metadata: {
            createdEntities,
          },
        },
      });

      // 8. Update thread updatedAt
      await prisma.aiChatThread.update({
        where: { id: threadId },
        data: { updatedAt: new Date() },
      });

      // 9. Send final done event
      res.write(
        `event: done\ndata: ${JSON.stringify({
          messageId: savedAssistantMsg.id,
          threadId,
          fullText: assistantFullText,
          createdEntities,
        })}\n\n`
      );
      res.end();
    } catch (err: any) {
      console.error('Erro no stream do Gemini:', err);
      res.write(
        `event: error\ndata: ${JSON.stringify({
          error: err.message || 'Erro durante a geração de resposta com o Gemini.',
        })}\n\n`
      );
      res.end();
    }
  }
}

export const aiService = new AiService();
