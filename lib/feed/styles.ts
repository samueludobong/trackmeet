// Composed feed stylesheet. Each section lives in ./styles/<section>.ts
// and is merged here so callers keep using `styles.X` unchanged.
export { moreOptionsStyles, profileSStyles } from './styles/misc';
import { intro } from './styles/intro';
import { topNavbar } from './styles/topNavbar';
import { stories } from './styles/stories';
import { nowplayingBubbleWiderThanStoryitemToFitArtistLine } from './styles/nowplayingBubbleWiderThanStoryitemToFitArtistLine';
import { nowplayingComposerBanner } from './styles/nowplayingComposerBanner';
import { attachedtrackChipShownBelowTheNowplayingBannerOnceIsTapped } from './styles/attachedtrackChipShownBelowTheNowplayingBannerOnceIsTapped';
import { cardShell } from './styles/cardShell';
import { postHeader } from './styles/postHeader';
import { media } from './styles/media';
import { musicPlayerVisualOnly } from './styles/musicPlayerVisualOnly';
import { poll } from './styles/poll';
import { actionRow } from './styles/actionRow';
import { floatingComposer } from './styles/floatingComposer';
import { songCardInPostdetailoverlayComposerBar } from './styles/songCardInPostdetailoverlayComposerBar';
import { songCardEmbeddedInsideACommentBubble } from './styles/songCardEmbeddedInsideACommentBubble';
import { bottomGlassNavbar } from './styles/bottomGlassNavbar';
import { swipeContainerReplyIndicator } from './styles/swipeContainerReplyIndicator';
import { quickReplyOverlay } from './styles/quickReplyOverlay';
import { attachedSongCardAboveTheQuickreplyInputGlass } from './styles/attachedSongCardAboveTheQuickreplyInputGlass';
import { actionMenuSheet } from './styles/actionMenuSheet';
import { postDetailOverlay } from './styles/postDetailOverlay';
import { commentRows } from './styles/commentRows';
import { threadedReplies } from './styles/threadedReplies';
import { detailReplyBar } from './styles/detailReplyBar';

export const styles = {
  ...intro,
  ...topNavbar,
  ...stories,
  ...nowplayingBubbleWiderThanStoryitemToFitArtistLine,
  ...nowplayingComposerBanner,
  ...attachedtrackChipShownBelowTheNowplayingBannerOnceIsTapped,
  ...cardShell,
  ...postHeader,
  ...media,
  ...musicPlayerVisualOnly,
  ...poll,
  ...actionRow,
  ...floatingComposer,
  ...songCardInPostdetailoverlayComposerBar,
  ...songCardEmbeddedInsideACommentBubble,
  ...bottomGlassNavbar,
  ...swipeContainerReplyIndicator,
  ...quickReplyOverlay,
  ...attachedSongCardAboveTheQuickreplyInputGlass,
  ...actionMenuSheet,
  ...postDetailOverlay,
  ...commentRows,
  ...threadedReplies,
  ...detailReplyBar,
} as const;
