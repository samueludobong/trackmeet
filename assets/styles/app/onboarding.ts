import { StyleSheet, Dimensions } from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  dissolveContainer: {
    flex: 1,
  },
  slideContent: {
    flex: 1,
  },
  blobArea: {
    height: SH * 0.5,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
  },
  star: {
    position: 'absolute',
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '700',
  },
  textArea: {
    paddingHorizontal: 30,
    paddingTop: 26,
    flex: 1,
  },
  titleBold: {
    fontSize: 38,
    fontWeight: '900',
    fontFamily: 'Inter_900Black',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  titleScript: {
    fontSize: 28,
    fontFamily: 'Pacifico_400Regular',
    lineHeight: 62,
    marginTop: -2,
  },
  subtitle: {
    fontSize: 15,
    color: '#c9c9c9',
    marginTop: 14,
    lineHeight: 23,
    maxWidth: SW * 0.78,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 18,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#2a2a2a',
  },
  buttonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 28,
    marginBottom: 18,
  },
  backButton: {
    flex: 1,
    height: '100%',
    backgroundColor: '#1e1e1e',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: '#ffffff',
  },
  buttonText: {
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_900Black',
    color: '#0D0D0D',
    letterSpacing: 0.4,
  },
});

