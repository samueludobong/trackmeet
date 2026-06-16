import React, { useState } from "react";
import { createCuratedPlaylistFull } from "../../services/playlists";
import { uploadImageToStorage } from "../../services/storage";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable, TextInput, Platform, KeyboardAvoidingView, ActivityIndicator, Alert, Keyboard } from "react-native";
import { CachedImage } from "../ui/CachedImage";

import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { cpStyles } from "../../assets/styles/feed/localStyles";
import { type CuratedPlaylist } from "../../lib/feed/types";

export function CreatePlaylistDialog({
  userId, onClose, onCreate,
}: {
  userId: string
  onClose: () => void
  onCreate: (playlist: CuratedPlaylist) => void
}) {
  const [name, setName] = useState('')
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [creating, setCreating] = useState(false)
  const [uploading, setUploading] = useState(false)

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) { Alert.alert('Permission required', 'Allow photo access to set a cover image.'); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return
    const uri = result.assets[0].uri
    setImageUri(uri)
    setUploading(true)
    try {
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg'
      const fileName = `${userId}/playlist-${Date.now()}.${ext}`
      const publicUrl = await uploadImageToStorage('post-media', fileName, uri, `image/${ext}`)
      setImageUrl(publicUrl)
    } catch (e) {
      console.log('[Playlist] cover upload exception:', e)
    }
    setUploading(false)
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (t && !tags.includes(t)) { setTags(prev => [...prev, t]); setTagInput('') }
  }

  const removeTag = (tag: string) => setTags(prev => prev.filter(t => t !== tag))

  const create = async () => {
    if (!name.trim() || creating) return
    setCreating(true)
    const created = await createCuratedPlaylistFull(userId, name, imageUrl, tags)
    setCreating(false)
    if (created) onCreate(created as CuratedPlaylist)
  }

  return (
    <Modal transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <Pressable style={cpStyles.dialogOverlay} onPress={onClose}>
          <Pressable onPress={(e) => { e.stopPropagation(); Keyboard.dismiss(); }}>
            <ScrollView style={cpStyles.dialogSheet} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={cpStyles.dialogHandle} />
              <Text style={cpStyles.dialogTitle}>Create Playlist</Text>

              {/* Cover image picker */}
              <TouchableOpacity style={cpStyles.imagePicker} onPress={pickImage} activeOpacity={0.8}>
                {imageUri
                  ? <CachedImage source={{ uri: imageUri }} style={{ width: 90, height: 90, borderRadius: 18 }} resizeMode="cover" />
                  : <>
                      <Ionicons name="camera-outline" size={26} color="rgba(255,255,255,0.35)" />
                      <Text style={cpStyles.imagePickerText}>Cover Photo</Text>
                    </>
                }
                {uploading && (
                  <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                    <ActivityIndicator color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Name */}
              <Text style={cpStyles.label}>PLAYLIST NAME</Text>
              <TextInput
                style={cpStyles.input}
                placeholder="Give it a name…"
                placeholderTextColor="rgba(255,255,255,0.25)"
                value={name}
                onChangeText={setName}
                maxLength={60}
              />

              {/* Tags */}
              <Text style={cpStyles.label}>TAGS</Text>
              {tags.length > 0 && (
                <View style={cpStyles.tagRow}>
                  {tags.map(tag => (
                    <TouchableOpacity key={tag} style={cpStyles.tagChip} onPress={() => removeTag(tag)} activeOpacity={0.75}>
                      <Text style={cpStyles.tagChipText}>{tag}</Text>
                      <Text style={cpStyles.tagChipText}> ×</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={cpStyles.tagInputRow}>
                <TextInput
                  style={cpStyles.tagInput}
                  placeholder="e.g. Chill, Late Night…"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  value={tagInput}
                  onChangeText={setTagInput}
                  onSubmitEditing={addTag}
                  returnKeyType="done"
                  maxLength={30}
                />
                <TouchableOpacity style={cpStyles.addTagBtn} onPress={addTag} activeOpacity={0.8}>
                  <Text style={cpStyles.addTagBtnText}>Add</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[cpStyles.createSubmitBtn, (!name.trim() || creating) && { opacity: 0.45 }]}
                onPress={create}
                activeOpacity={0.8}
                disabled={!name.trim() || creating}
              >
                {creating
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={cpStyles.createSubmitText}>Create Playlist</Text>
                }
              </TouchableOpacity>
              <View style={{ height: 20 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

// ─── Real song rows ───────────────────────────────────────────────────────────
