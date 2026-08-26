const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

const collaboratorModel = `
model WorkspaceCollaborator {
  id          String    @id @default(uuid())
  workspaceId String
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now())

  @@unique([workspaceId, userId])
}
`;

let newSchema = schema.replace(
  'workspaces  Workspace[]',
  'workspaces  Workspace[]\n  collaborations WorkspaceCollaborator[]'
);

newSchema = newSchema.replace(
  'user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)',
  'user        User        @relation(fields: [userId], references: [id], onDelete: Cascade)\n  isCollaborative Boolean @default(false)\n  collaborators WorkspaceCollaborator[]'
);

fs.writeFileSync('prisma/schema.prisma', newSchema + '\n' + collaboratorModel);
console.log('Schema updated successfully');
