import { useEffect, useState } from "react";
import { Keyboard, Platform } from "react-native";

/**
 * Current on-screen keyboard height (0 when hidden). Lets bottom sheets cap
 * their height to the space above the keyboard so their header / action button
 * never gets pushed off the top of the screen while typing.
 */
export function useKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const show = Keyboard.addListener(showEvt, (e) => setHeight(e.endCoordinates?.height ?? 0));
    const hide = Keyboard.addListener(hideEvt, () => setHeight(0));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return height;
}
