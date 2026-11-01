import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, SectionList, Text, View } from 'react-native';
import { Link, Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { loadClothing, deleteClothing, moveToWardrobe } from '../services/wardrobeStorage';
import { categories, categoryLabel, collectionSections, storeLink } from '../services/collectionView';
import type { Category, CollectionSort } from '../services/collectionView';
import { AccountPanel } from '../components/AccountPanel';
import type { ClothingStatus, SavedClothing } from '../types/clothing';
import { styles } from '../styles/collectionStyles';

export default function WardrobeScreen() {
  const { status: selectedStatus } = useLocalSearchParams<{ status?: string }>();
  const status: ClothingStatus = selectedStatus === 'wishlist' ? 'wishlist' : 'owned';
  const [items, setItems] = useState<SavedClothing[]>([]);
  const [category, setCategory] = useState<Category | 'all'>('all');
  const [sort, setSort] = useState<CollectionSort>('type');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const deleteBusy = useRef(false);
  const active = useRef(false);
  const requestId = useRef(0);
  const refresh = useCallback(() => {
    setConfirmDelete(null);
    const request = ++requestId.current;
    setLoading(true); setError(null);
    loadClothing().then(data => {
      if (active.current && request === requestId.current) setItems(data);
    }).catch(() => {
      if (active.current && request === requestId.current) setError('Could not load your collection. Please try again.');
    }).finally(() => {
      if (active.current && request === requestId.current) setLoading(false);
    });
  }, []);
  useFocusEffect(useCallback(() => {
    active.current = true; refresh();
    return () => { active.current = false; requestId.current++; };
  }, [refresh]));
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onFocus = () => { if (active.current) refresh(); };
    window.addEventListener('focus', onFocus);
    window.addEventListener('storage', onFocus);
    return () => { window.removeEventListener('focus', onFocus); window.removeEventListener('storage', onFocus); };
  }, [refresh]);
  async function removeItem(item: SavedClothing) {
    if (deleteBusy.current) return;
    deleteBusy.current = true; setDeleting(true); setDeleteError('');
    try {
      await deleteClothing(item);
      if (active.current) refresh();
    } catch {
      if (active.current) setDeleteError('Could not delete this item. Please try again.');
    } finally {
      deleteBusy.current = false;
      setDeleting(false);
    }
  }
  async function markBought(item: SavedClothing) {
    if (deleteBusy.current) return;
    deleteBusy.current = true; setMoving(item.sourceUrl); setDeleteError(''); setConfirmDelete(null);
    try {
      await moveToWardrobe(item.sourceUrl);
      if (active.current) {
        setCategory('all');
        router.setParams({ status: 'owned' });
        refresh();
      }
    } catch {
      if (active.current) setDeleteError('Could not move this item. Please try again.');
    } finally { deleteBusy.current = false; setMoving(null); }
  }
  const sections = collectionSections(items, status, category, sort);
  const count = sections.reduce((total, section) => total + section.data.length, 0);
  const collectionHeader = <View style={styles.listHeader}>
    <Text style={styles.eyebrow}>{status === 'owned' ? 'Your collection' : 'Saved for later'}</Text>
    <Text style={styles.title}>{status === 'owned' ? 'My Wardrobe' : 'My Wishlist'}</Text>
    <Text style={styles.subtitle}>{status === 'owned' ? 'Everything you own, ready to style.' : 'Pieces you are considering for your collection.'}</Text>
    <View style={styles.row}>
      {(['owned', 'wishlist'] as const).map(value => (
        <Pressable key={value} style={[styles.option, status === value && styles.selected]} accessibilityRole="button" accessibilityState={{ selected: status === value }} onPress={() => { setCategory('all'); router.setParams({ status: value }); }}>
          <Text style={status === value ? styles.optionTextSelected : styles.optionText}>{value === 'owned' ? 'Wardrobe' : 'Wishlist'}</Text>
        </Pressable>
      ))}
    </View>
    <AccountPanel onChange={refresh} />
    <ScrollView horizontal style={styles.filters} contentContainerStyle={styles.chips} showsHorizontalScrollIndicator={false}>
      {(['all', ...categories] as const).map(value => <Pressable key={value} style={[styles.chip, category === value && styles.selected]} accessibilityRole="button" accessibilityLabel={`Filter ${categoryLabel(value)}`} accessibilityState={{ selected: category === value }} onPress={() => setCategory(value)}><Text style={category === value ? styles.chipTextSelected : styles.chipText}>{categoryLabel(value)}</Text></Pressable>)}
    </ScrollView>
    <View style={styles.sortRow}>
      <Text style={styles.message}>{count} {count === 1 ? 'item' : 'items'}</Text>
      <Text style={styles.message}>Sort</Text>
      {(['type', 'newest', 'name'] as const).map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`Sort by ${value}`} accessibilityState={{ selected: sort === value }} style={[styles.chip, sort === value && styles.selected]} onPress={() => setSort(value)}><Text style={sort === value ? styles.chipTextSelected : styles.chipText}>{value === 'type' ? 'Type' : value === 'newest' ? 'Newest' : 'Name'}</Text></Pressable>)}
    </View>
  </View>;
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Collection' }} />
      {loading ? <ScrollView style={styles.collectionList} contentContainerStyle={styles.list}>{collectionHeader}<ActivityIndicator color="#5E2D4F" /></ScrollView>
        : error ? <ScrollView style={styles.collectionList} contentContainerStyle={styles.list}>{collectionHeader}<View style={styles.errorPanel}><Text style={styles.error}>{error}</Text><Pressable style={styles.button} accessibilityRole="button" onPress={refresh}><Text style={styles.buttonText}>Try Again</Text></Pressable></View></ScrollView> : (
        <SectionList style={styles.collectionList} sections={sections} keyExtractor={item => `${item.status}:${item.sourceUrl}`} stickySectionHeadersEnabled={false} contentContainerStyle={styles.list}
          ListHeaderComponent={collectionHeader}
          ListEmptyComponent={<View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>{category === 'all' ? `Your ${status === 'owned' ? 'wardrobe' : 'wishlist'} is ready for its first piece.` : `No ${categoryLabel(category).toLowerCase()} here yet.`}</Text>
            <Text style={styles.message}>{category === 'all' ? 'Add something manually or import it straight from a store.' : 'Try another category or add a new item.'}</Text>
            <Pressable style={styles.emptyButton} accessibilityRole="button" onPress={() => router.push({ pathname: '/add-item', params: { status } })}><Text style={styles.buttonText}>Add your first item</Text></Pressable>
          </View>}
          renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title} · {section.data.length}</Text>}
          renderItem={({ item }) => {
            const url = storeLink(item.sourceUrl);
            const key = `${item.status}:${item.sourceUrl}`;
            return <View style={styles.card}>
              {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />}
              <Text style={styles.cardEyebrow}>{categoryLabel(item.category ?? 'uncategorized')}</Text>
              <Text style={styles.name}>{item.name ?? `${categoryLabel(item.category ?? 'uncategorized')} item`}</Text>
              {!![item.brand, item.color, item.subcategory].filter(Boolean).length && <Text style={styles.meta}>{[item.brand, item.color, item.subcategory].filter(Boolean).join(' · ')}</Text>}
              {item.price !== null && <Text style={styles.price}>{item.price} {item.currency ?? ''}</Text>}
              {url && <Link href={url as `https://${string}`} target="_blank" rel="noopener noreferrer" accessibilityLabel={`Open store page for ${item.name ?? 'this item'}`} style={styles.storeLink}>Open store page ↗</Link>}
              {item.status === 'wishlist' && <Pressable style={styles.moveButton} accessibilityRole="button" disabled={deleting || moving !== null} onPress={() => markBought(item)}><Text style={styles.moveButtonText}>{moving === item.sourceUrl ? 'Moving…' : 'I bought this  →'}</Text></Pressable>}
              {confirmDelete === key ? <View style={styles.confirmPanel}>
                <Text style={styles.meta}>Delete {item.name ?? 'this item'} from {item.status === 'owned' ? 'Wardrobe' : 'Wishlist'}? This cannot be undone.</Text>
                <View style={styles.row}>
                  <Pressable accessibilityRole="button" disabled={deleting || moving !== null} style={styles.chip} onPress={() => setConfirmDelete(null)}><Text style={styles.chipText}>Cancel</Text></Pressable>
                  <Pressable accessibilityRole="button" disabled={deleting || moving !== null} style={styles.chip} onPress={() => removeItem(item)}><Text style={styles.dangerText}>{deleting ? 'Deleting…' : 'Confirm delete'}</Text></Pressable>
                </View>
              </View> : <Pressable accessibilityRole="button" accessibilityLabel={`Delete ${item.name ?? 'item'}`} disabled={deleting || moving !== null} style={styles.dangerAction} onPress={() => { setDeleteError(''); setConfirmDelete(key); }}><Text style={styles.dangerText}>Remove item</Text></Pressable>}
            </View>;
          }} />
      )}
      {deleteError ? <Text accessibilityRole="alert" style={styles.error}>{deleteError}</Text> : null}
      <View style={styles.actionPanel}>
        {status === 'owned' && <Pressable style={styles.button} accessibilityRole="button" onPress={() => router.push('/outfit')}><Text style={styles.primaryButtonText}>Style an outfit  →</Text></Pressable>}
        <View style={styles.actionRow}>
          <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => router.push({ pathname: '/add-item', params: { status } })}><Text style={styles.secondaryButtonText}>Add manually</Text></Pressable>
          <Pressable style={styles.secondaryButton} accessibilityRole="button" onPress={() => router.navigate({ pathname: '/', params: { status } })}><Text style={styles.secondaryButtonText}>Import a link</Text></Pressable>
        </View>
      </View>
    </View>
  );
}
