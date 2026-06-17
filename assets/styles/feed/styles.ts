// Composed feed stylesheet. Each section lives in ./styles/<section>.ts
// and is merged here so callers keep using `styles.X` unchanged.
export { moreOptionsStyles, profileSStyles } from './styles/misc';
import { intro } from './styles/intro';
import { topNavbar } from './styles/topNavbar';
import { stories } from './styles/stories';
import { nowPlayingBubble } from './styles/nowPlayingBubble';
import { nowPlayingComposerBanner } from './styles/nowPlayingComposerBanner';
import { attachedTrackChip } from './styles/attachedTrackChip';
import { cardShell } from './styles/cardShell';
import { postHeader } from './styles/postHeader';
import { media } from './styles/media';
import { musicPlayer } from './styles/musicPlayer';
import { poll } from './styles/poll';
import { actionRow } from './styles/actionRow';
import { floatingComposer } from './styles/floatingComposer';
import { detailComposerSongCard } from './styles/detailComposerSongCard';
import { commentSongCard } from './styles/commentSongCard';
import { bottomGlassNavbar } from './styles/bottomGlassNavbar';
import { swipeContainer } from './styles/swipeContainer';
import { quickReplyOverlay } from './styles/quickReplyOverlay';
import { quickReplyAttachedSong } from './styles/quickReplyAttachedSong';
import { actionMenuSheet } from './styles/actionMenuSheet';
import { postDetailOverlay } from './styles/postDetailOverlay';
import { commentRows } from './styles/commentRows';
import { threadedReplies } from './styles/threadedReplies';
import { detailReplyBar } from './styles/detailReplyBar';

export const styles = {
  ...intro,
  ...topNavbar,
  ...stories,
  ...nowPlayingBubble,
  ...nowPlayingComposerBanner,
  ...attachedTrackChip,
  ...cardShell,
  ...postHeader,
  ...media,
  ...musicPlayer,
  ...poll,
  ...actionRow,
  ...floatingComposer,
  ...detailComposerSongCard,
  ...commentSongCard,
  ...bottomGlassNavbar,
  ...swipeContainer,
  ...quickReplyOverlay,
  ...quickReplyAttachedSong,
  ...actionMenuSheet,
  ...postDetailOverlay,
  ...commentRows,
  ...threadedReplies,
  ...detailReplyBar,
} as const;

