import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { CachedImage } from "../ui/CachedImage";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../app/signup.styles";

/** The saved-accounts quick-login list shown in "accounts" mode. */
export function SignupAccountsList({ savedAccounts, handleSelectSavedAccount, handleUseAnotherAccount }: any) {
  return (
    <>
      <Text style={styles.expandedTitle}>Welcome back</Text>
      <Text style={[styles.expandedSub, { marginBottom: 8 }]}>Sign in to continue</Text>
      {savedAccounts.map((account: any) => (
        <TouchableOpacity key={account.email} style={styles.savedAccountCard} activeOpacity={0.82} onPress={() => handleSelectSavedAccount(account)}>
          {account.avatarUrl ? (
            <CachedImage source={{ uri: account.avatarUrl }} style={styles.savedAccountAvatar} />
          ) : (
            <View style={[styles.savedAccountAvatar, styles.savedAccountAvatarFallback]}>
              <Text style={styles.savedAccountInitials}>{(account.displayName || account.username || "?").slice(0, 1).toUpperCase()}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.savedAccountName} numberOfLines={1}>{account.displayName || account.username}</Text>
            <Text style={styles.savedAccountHandle} numberOfLines={1}>@{account.username}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      ))}
      <TouchableOpacity style={styles.anotherAccountBtn} activeOpacity={0.75} onPress={handleUseAnotherAccount}>
        <Ionicons name="person-add-outline" size={16} color="rgba(255,255,255,0.55)" />
        <Text style={styles.anotherAccountText}>Use another account</Text>
      </TouchableOpacity>
    </>
  );
}
