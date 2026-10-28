// Takes a selfie for a document: the tips screen, then the framed camera (or the gallery). Returns the picture's uri.
import React, { useState } from "react";
import { Modal, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { colors } from "../lib/theme";
import { SelfieCamera } from "./SelfieCamera";
import { SelfieIntro } from "./SelfieIntro";

export function SelfieCaptureModal({ visible, onClose, onPicked }: { visible: boolean; onClose: () => void; onPicked: (uri: string) => void }) {
  const [camera, setCamera] = useState(false);

  function done(uri: string) {
    setCamera(false);
    onClose();
    onPicked(uri);
  }
  async function gallery() {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets[0]) done(res.assets[0].uri);
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent onRequestClose={() => (camera ? setCamera(false) : onClose())}>
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        {camera ? <SelfieCamera onShot={done} onBack={() => setCamera(false)} /> : <SelfieIntro onTake={() => setCamera(true)} onGallery={gallery} onBack={onClose} />}
      </View>
    </Modal>
  );
}
