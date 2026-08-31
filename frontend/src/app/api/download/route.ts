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
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=10`, {
      headers: {
        'User-Agent': 'Synap-Download-Router',
        Accept: 'application/vnd.github.v3+json',
      },
      next: { revalidate: 60 }, // Cache response for 60 seconds
    });

    if (!res.ok) {
      return NextResponse.redirect(FALLBACK_RELEASES_URL, { status: 302 });
    }

    const releases: GitHubRelease[] = await res.json();
    if (!Array.isArray(releases) || releases.length === 0) {
      return NextResponse.redirect(FALLBACK_RELEASES_URL, { status: 302 });
    }

    // Find the latest release that actually contains uploaded assets
    const releaseWithAssets = releases.find((r) => Array.isArray(r.assets) && r.assets.length > 0);

    if (!releaseWithAssets) {
      return NextResponse.redirect(FALLBACK_RELEASES_URL, { status: 302 });
    }

    const assets = releaseWithAssets.assets;
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

    return NextResponse.redirect(FALLBACK_RELEASES_URL, { status: 302 });
  } catch (err) {
    console.error('[Download Route Error]:', err);
    return NextResponse.redirect(FALLBACK_RELEASES_URL, { status: 302 });
  }
}
