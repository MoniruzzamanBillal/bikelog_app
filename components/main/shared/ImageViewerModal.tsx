import { COLORS } from "@/utils/colors";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { IconButton, Modal, Portal } from "react-native-paper";

type TViewerImage = { url: string; publicId?: string };

interface ImageViewerModalProps {
  visible: boolean;
  images: TViewerImage[];
  initialIndex: number;
  onDismiss: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function ImageViewerModal({
  visible,
  images,
  initialIndex,
  onDismiss,
}: ImageViewerModalProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList<TViewerImage>>(null);

  // Reset to the tapped image whenever the modal opens (or the caller changes
  // which index it wants shown while already open).
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      flatListRef.current?.scrollToOffset({
        offset: initialIndex * SCREEN_WIDTH,
        animated: false,
      });
    }
  }, [visible, initialIndex]);

  const goToIndex = (index: number) => {
    if (index < 0 || index >= images.length) return;
    flatListRef.current?.scrollToIndex({ index, animated: true });
    setCurrentIndex(index);
  };

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const index = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH
    );
    setCurrentIndex(index);
  };

  if (images.length === 0) return null;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modal}
      >
        <Pressable style={styles.backdrop} onPress={onDismiss}>
          <View style={styles.imageArea} pointerEvents="box-none">
            {images.length > 1 ? (
              <FlatList
                ref={flatListRef}
                data={images}
                keyExtractor={(item, index) => item.publicId ?? `${item.url}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={initialIndex}
                getItemLayout={(_, index) => ({
                  length: SCREEN_WIDTH,
                  offset: SCREEN_WIDTH * index,
                  index,
                })}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                renderItem={({ item }) => (
                  <View style={styles.page}>
                    <Image
                      source={{ uri: item.url }}
                      style={styles.image}
                      contentFit="contain"
                    />
                  </View>
                )}
              />
            ) : (
              <Image
                source={{ uri: images[0].url }}
                style={styles.image}
                contentFit="contain"
              />
            )}
          </View>

          <IconButton
            icon={() => (
              <MaterialCommunityIcons name="close" size={26} color={COLORS.white} />
            )}
            onPress={onDismiss}
            style={styles.closeButton}
          />

          {images.length > 1 && (
            <>
              <View style={styles.counter}>
                <Text style={styles.counterText}>
                  {currentIndex + 1} / {images.length}
                </Text>
              </View>

              <IconButton
                icon={() => (
                  <MaterialCommunityIcons
                    name="chevron-left"
                    size={32}
                    color={currentIndex === 0 ? COLORS.textLight : COLORS.white}
                  />
                )}
                disabled={currentIndex === 0}
                onPress={() => goToIndex(currentIndex - 1)}
                style={[styles.navButton, styles.navButtonLeft]}
              />
              <IconButton
                icon={() => (
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={32}
                    color={
                      currentIndex === images.length - 1
                        ? COLORS.textLight
                        : COLORS.white
                    }
                  />
                )}
                disabled={currentIndex === images.length - 1}
                onPress={() => goToIndex(currentIndex + 1)}
                style={[styles.navButton, styles.navButtonRight]}
              />
            </>
          )}
        </Pressable>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    flex: 1,
    backgroundColor: "black",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "black",
  },
  imageArea: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  closeButton: {
    position: "absolute",
    top: 40,
    right: 8,
  },
  counter: {
    position: "absolute",
    top: 48,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  counterText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: "600",
  },
  navButton: {
    position: "absolute",
    top: "50%",
    marginTop: -24,
  },
  navButtonLeft: {
    left: 4,
  },
  navButtonRight: {
    right: 4,
  },
});
