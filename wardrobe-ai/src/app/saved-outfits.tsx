import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { loadClothing } from '../services/wardrobeStorage';
import { loadSavedOutfits, deleteSavedOutfit, type SavedOutfit } from '../services/outfitStorage';
import type { SavedClothing } from '../types/clothing';
import { Text } from '../components/AppTypography';
import { RouteSeo } from '../components/RouteSeo';
import { styles } from '../styles/outfitStyles';
import { BrandColors } from '../constants/brand';
export default function SavedOutfitsScreen() {
 const [savedOutfits,setSavedOutfits]=useState<SavedOutfit[]>([]);
 const [owned,setOwned]=useState<SavedClothing[]>([]);
 const [loadingSaved,setLoadingSaved]=useState(true);
 const [error,setError]=useState('');
 const [confirmDelete,setConfirmDelete]=useState<string|null>(null);
 const [deleting,setDeleting]=useState<string|null>(null);
 useEffect(()=>{Promise.all([loadSavedOutfits(),loadClothing()]).then(([looks,items])=>{setSavedOutfits(looks);setOwned(items);}).catch(()=>setError('Could not load saved outfits.')).finally(()=>setLoadingSaved(false));},[]);
 async function removeSavedOutfit(id:string){setDeleting(id);try{await deleteSavedOutfit(id);setSavedOutfits(previous=>previous.filter(value=>value.id!==id));setConfirmDelete(null);}catch{setError('Could not remove outfit.');}finally{setDeleting(null);}}
 return <ScrollView contentContainerStyle={styles.container}>
      <RouteSeo title="Saved outfits | Wearly" path="/saved-outfits" noIndex />
      <View style={styles.savedSection}>
        <View style={styles.savedHeading}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Saved outfits</Text>
            <Text style={styles.sectionSubtitle}>Keep looks you want to wear again.</Text>
          </View>
          <View style={styles.savedCount}><Text style={styles.savedCountText}>{savedOutfits.length}</Text></View>
        </View>
        {loadingSaved ? <ActivityIndicator color={BrandColors.charcoal} /> : savedOutfits.length === 0 ? <Text style={styles.emptySaved}>Your saved outfits will appear here.</Text> : savedOutfits.map(saved => {
          const savedItems = saved.outfit.sourceUrls.map(sourceUrl => owned.find(value => value.sourceUrl === sourceUrl)).filter((item): item is SavedClothing => !!item);
          const pieceNames = savedItems.map(item => item.name ?? item.subcategory ?? 'Wardrobe item');
          return <View key={saved.id} style={styles.savedCard}>
            <View style={styles.savedCardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.savedTitle}>{saved.outfit.title}</Text>
                <Text style={styles.savedMeta}>{saved.occasion} · {saved.weather.location} · {Math.round(saved.weather.temperatureC)}°C</Text>
              </View>
              <Text style={styles.savedDate}>{new Date(saved.savedAt).toLocaleDateString()}</Text>
            </View>
            {!!savedItems.some(item => !!item.imageUrl) && <View style={styles.savedImages}>
              {savedItems.map(item => item.imageUrl ? <Image key={item.sourceUrl} source={{ uri: item.imageUrl }} style={styles.savedImage} resizeMode="cover" accessibilityLabel={item.name ?? 'Saved outfit piece'} /> : null)}
            </View>}
            <Text style={styles.savedPieces}>{pieceNames.join(' · ')}</Text>
            <Text style={styles.savedTip}>{saved.outfit.weatherTip}</Text>
            {confirmDelete === saved.id ? <View style={styles.confirmPanel}>
              <Text style={styles.savedMeta}>Remove this saved outfit?</Text>
              <View style={styles.confirmRow}>
                <Pressable accessibilityRole="button" disabled={!!deleting} style={styles.smallButton} onPress={() => setConfirmDelete(null)}><Text style={styles.smallButtonText}>Cancel</Text></Pressable>
                <Pressable accessibilityRole="button" disabled={!!deleting} style={styles.smallButton} onPress={() => removeSavedOutfit(saved.id)}><Text style={styles.removeText}>{deleting === saved.id ? 'Removing…' : 'Remove'}</Text></Pressable>
              </View>
            </View> : <Pressable accessibilityRole="button" accessibilityLabel={`Remove saved outfit ${saved.outfit.title}`} onPress={() => setConfirmDelete(saved.id)}><Text style={styles.removeText}>Remove saved outfit</Text></Pressable>}
          </View>;
        })}
      </View>

{!!error && <Text accessibilityRole="alert">{error}</Text>}
</ScrollView>;
}

