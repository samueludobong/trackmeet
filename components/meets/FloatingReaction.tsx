import React, { useRef, useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Animated, Pressable } from "react-native";
import { reactStyles } from "../../assets/styles/feed/localStyles";
import { REACTION_PRIMARY, REACTION_SECONDARY } from "../../constants/meets";
import { type FloatingReactionItem } from "../../types/meets";

export function FloatingReaction({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  const rise    = useRef(new Animated.Value(0)).current;
  const fade    = useRef(new Animated.Value(1)).current;
  const drift   = useRef((Math.random() - 0.5) * 70).current;
  const startX  = useRef(Math.random() * 22).current;
  const scale   = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(rise,  { toValue: -260, duration: 2400, useNativeDriver: true }),
      Animated.timing(fade,  { toValue: 0,    duration: 2400, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start(() => onDone());
  }, []);

  return (
    <Animated.Text
      pointerEvents="none"
      style={{
        position: "absolute",
        bottom: 0,
        right: startX,
        fontSize: 30,
        opacity: fade,
        transform: [{ translateY: rise }, { translateX: drift }, { scale }],
      }}
    >
      {emoji}
    </Animated.Text>
  );
}

// Overlay that holds the currently-animating reactions. Driven by an array of
// items; each removes itself from the parent's state when its animation finishes.
export function FloatingReactionLayer({
  items, onItemDone,
}: { items: FloatingReactionItem[]; onItemDone: (id: number) => void }) {
  return (
    <View style={reactStyles.floatLayer} pointerEvents="none">
      {items.map((it) => (
        <FloatingReaction key={it.id} emoji={it.emoji} onDone={() => onItemDone(it.id)} />
      ))}
    </View>
  );
}

// Heart button: tap to send the primary reaction, long-press for the secondary menu.
export function ReactionButton({ onReact }: { onReact: (emoji: string) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const pop = useRef(new Animated.Value(1)).current;

  const bump = () => {
    pop.setValue(0.7);
    Animated.spring(pop, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const send = (emoji: string) => {
    bump();
    onReact(emoji);
  };

  return (
    <View>
      {menuOpen && (
        <>
          {/* Tap-away catcher */}
          <Pressable style={reactStyles.menuBackdrop} onPress={() => setMenuOpen(false)} />
          <View style={reactStyles.menu}>
            {REACTION_SECONDARY.map((e) => (
              <TouchableOpacity
                key={e}
                style={reactStyles.menuItem}
                activeOpacity={0.7}
                onPress={() => { send(e); setMenuOpen(false); }}
              >
                <Text style={reactStyles.menuEmoji}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}
      <TouchableOpacity
        style={reactStyles.heartBtn}
        activeOpacity={0.75}
        onPress={() => send(REACTION_PRIMARY)}
        onLongPress={() => setMenuOpen(true)}
        delayLongPress={250}
      >
        <Animated.Text style={[reactStyles.heartEmoji, { transform: [{ scale: pop }] }]}>
          {REACTION_PRIMARY}
        </Animated.Text>
      </TouchableOpacity>
    </View>
  );
}


// ─── Listener Meet room ───────────────────────────────────────────────────────
