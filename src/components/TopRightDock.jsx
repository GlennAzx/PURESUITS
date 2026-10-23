import React from 'react';
import BgmPlayer from './BgmPlayer';
import DiscordPill from './DiscordPill';

/**
 * The top-right control cluster: music toggle, then the Discord link.
 *
 * Both live in one flex row so the spacing is real layout rather than two
 * fixed elements agreeing on coordinates. Discord stays rightmost because it is
 * the one thing a new visitor is most likely to want.
 *
 * z-30 on purpose: the nav scrim is z-40, so opening the menu dims this cluster
 * with the rest of the page instead of leaving it floating above the overlay.
 *
 * The cluster is rendered once in App, not per page, so it does not flicker or
 * remount during a route change.
 */
export default function TopRightDock({ discordUrl, bgmSrc }) {
  return (
    <div className="fixed right-4 top-4 z-30 flex items-center gap-2 sm:right-6 sm:top-6">
      <BgmPlayer src={bgmSrc} />
      <DiscordPill href={discordUrl} />
    </div>
  );
}
