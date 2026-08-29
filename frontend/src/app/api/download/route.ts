import { NextRequest, NextResponse } from 'next/server';

const GITHUB_REPO = 'GDiniz12/synap';
const FALLBACK_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`;

interface GitHubAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetOS = (searchParams.get('os') || 'windows').toLowerCase();

  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'User-Agent': 'Synap-Download-Router',
        Accept: 'application/vnd.github.v3+json',
      },
      next: { revalidate: 300 }, // Cache GitHub API response for 5 minutes
    });

    if (!res.ok) {
      // Fallback redirect to releases page if not found or rate-limited
      return NextResponse.redirect(FALLBACK_RELEASES_URL, { status: 302 });
    }

    const release: GitHubRelease = await res.json();
    const assets = release.assets || [];

    let matchedAsset: GitHubAsset | undefined;

    if (targetOS === 'windows' || targetOS === 'win') {
      matchedAsset = assets.find((a) => a.name.toLowerCase().endsWith('.exe'));
    } else if (targetOS === 'linux-appimage' || targetOS === 'appimage' || targetOS === 'linux') {
      matchedAsset =
        assets.find((a) => a.name.toLowerCase().endsWith('.appimage')) ||
        assets.find((a) => a.name.toLowerCase().endsWith('.deb'));
    } else if (targetOS === 'linux-deb' || targetOS === 'deb') {
      matchedAsset = assets.find((a) => a.name.toLowerCase().endsWith('.deb'));
    } else if (targetOS === 'mac' || targetOS === 'macos' || targetOS === 'darwin') {
      matchedAsset =
        assets.find((a) => a.name.toLowerCase().endsWith('.dmg')) ||
        assets.find((a) => a.name.toLowerCase().endsWith('.zip'));
    }

    if (matchedAsset && matchedAsset.browser_download_url) {
      return NextResponse.redirect(matchedAsset.browser_download_url, { status: 302 });
    }

    // Direct download fallback with generic filename pattern
    if (release.tag_name) {
      const tag = release.tag_name;
      const cleanVer = tag.replace(/^v/, '');
      if (targetOS === 'windows' || targetOS === 'win') {
        return NextResponse.redirect(
          `https://github.com/${GITHUB_REPO}/releases/download/${tag}/Synap-Setup-${cleanVer}.exe`,
          { status: 302 }
        );
      }
      if (targetOS === 'linux' || targetOS === 'linux-appimage') {
        return NextResponse.redirect(
          `https://github.com/${GITHUB_REPO}/releases/download/${tag}/Synap-${cleanVer}.AppImage`,
          { status: 302 }
        );
      }
      if (targetOS === 'linux-deb') {
        return NextResponse.redirect(
          `https://github.com/${GITHUB_REPO}/releases/download/${tag}/synap_${cleanVer}_amd64.deb`,
          { status: 302 }
        );
      }
      if (targetOS === 'mac') {
        return NextResponse.redirect(
          `https://github.com/${GITHUB_REPO}/releases/download/${tag}/Synap-${cleanVer}.dmg`,
          { status: 302 }
        );
      }
    }

    return NextResponse.redirect(FALLBACK_RELEASES_URL, { status: 302 });
  } catch (err) {
    console.error('[Download Route Error]:', err);
    return NextResponse.redirect(FALLBACK_RELEASES_URL, { status: 302 });
  }
}
