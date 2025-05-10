import streamDeck from "@elgato/streamdeck";
import { CopyNextNumberAction } from "./actions/copy-next-number";
import { PasteMessageAction }    from "./actions/paste-message";

streamDeck.actions.registerAction(
  new CopyNextNumberAction("com.maxpowell.auto-deck.copy-next-number")
);
streamDeck.actions.registerAction(
  new PasteMessageAction   ("com.maxpowell.auto-deck.paste-message")
);

streamDeck.connect();
