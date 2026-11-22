// CouCouMTL community: posts (text, photos, videos) with comments, and clubs
// run by volunteers with live sessions (club chat + one-tap video call).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { File } from 'expo-file-system';
import { useVideoPlayer, VideoView } from 'expo-video';
import { WebView } from 'react-native-webview';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { makeStyles, useCoucouTheme } from '../theme/coucou';
import { STRINGS } from './strings';

const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
// The live room page (voice + speaking avatars) is hosted with our website and
// shown inside the app, so nobody leaves CouCouMTL.
const LIVE_ROOM_URL = 'https://coucoumtl.vercel.app/live.html';

function LiveRoom({ visible, club, live, userId, onClose, onEnd }) {
  const { C } = useCoucouTheme();
  const [config, setConfig] = useState(null);
  const webRef = useRef(null);
  const leaveRoom = () => {
    // Let the page stop the microphone first; close anyway after a moment.
    webRef.current?.injectJavaScript('window.__coucouLeave && window.__coucouLeave(); true;');
    setTimeout(() => onClose('leave'), 400);
  };
  useEffect(() => {
    if (!visible) return;
    supabase.auth.getSession().then(({ data }) => {
      setConfig({
        supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
        supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
        accessToken: data.session?.access_token,
        sessionId: live.id,
        clubId: club.id,
        hostId: club.owner_id,
        userId,
        clubName: club.name,
        category: categoryLabel(club.category),
        title: live.title,
        theme: C.name,
      });
    });
  }, [visible, club, live, userId, C.name]);

  function onMessage(event) {
    let message = {};
    try {
      message = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (message.type === 'end') onEnd();
    if (['leave', 'end', 'ended', 'kicked'].includes(message.type)) onClose(message.type);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={leaveRoom}>
      <SafeAreaProvider>
      <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: C.page }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderColor: C.border,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Leave the live room"
            hitSlop={12}
            onPress={leaveRoom}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}
          >
            <Feather name="phone-off" size={18} color={C.error} />
            <Text style={{ color: C.error, fontWeight: '800', fontSize: 16 }}>Leave</Text>
          </Pressable>
          <Text style={{ color: C.muted, fontWeight: '800', fontSize: 13 }} numberOfLines={1}>
            {club.name}
          </Text>
        </View>
        {Platform.OS === 'web' ? (
          <View style={{ padding: 24, gap: 12 }}>
            <Text style={{ color: C.text, fontWeight: '800' }}>
              Live rooms work in the phone app. Open CouCouMTL in Expo Go to join.
            </Text>
            <Pill label="Close" onPress={() => onClose('leave')} />
          </View>
        ) : config ? (
          <WebView
            ref={webRef}
            source={{ uri: LIVE_ROOM_URL }}
            scrollEnabled
            bounces
            contentInsetAdjustmentBehavior="never"
            injectedJavaScriptBeforeContentLoaded={`window.COUCOU = ${JSON.stringify(config)}; true;`}
            onMessage={onMessage}
            javaScriptEnabled
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            mediaCapturePermissionGrantType="grant"
            style={{ flex: 1, backgroundColor: C.page }}
          />
        ) : null}
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}
const CLUB_CATEGORIES = [
  ['language', 'Languages'],
  ['newcomers', 'Newcomers'],
  ['winter', 'Winter'],
  ['city_life', 'City life'],
  ['environment', 'Environment'],
  ['technology', 'Technology'],
  ['books', 'Books'],
  ['sports', 'Sports & biking'],
  ['other', 'Other'],
];
const categoryLabel = (value) =>
  CLUB_CATEGORIES.find(([v]) => v === value)?.[1] ?? 'Other';

function errorText(error, fallback) {
  if (error && typeof error === 'object' && typeof error.message === 'string') {
    return error.message;
  }
  return fallback;
}

function timeAgo(value) {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return 'now';
  if (minutes < 60) return minutes + ' min';
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours + ' h';
  return new Date(value).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
}

async function readBytes(uri) {
  try {
    return await new File(uri).bytes();
  } catch {
    const response = await fetch(uri);
    return new Uint8Array(await response.arrayBuffer());
  }
}

function Pill({ label, onPress, active = true, disabled = false, icon }) {
  const st = useStyles();
  const { C } = useCoucouTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        st.pill,
        !active && st.pillSoft,
        (pressed || disabled) && { opacity: 0.55 },
      ]}
    >
      {icon ? (
        <Feather name={icon} size={15} color={active ? C.onPrimary : C.softText} />
      ) : null}
      <Text style={[st.pillText, !active && st.pillTextSoft]}>{label}</Text>
    </Pressable>
  );
}

function Avatar({ name, url, size = 38 }) {
  const { C } = useCoucouTheme();
  const box = {
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: C.lilac,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };
  if (url) return <Image source={{ uri: url }} style={box} accessibilityLabel={name + ' profile picture'} />;
  const initials = String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
  return (
    <View style={box}>
      <Text style={{ color: C.onAccent, fontWeight: '900', fontSize: size * 0.38 }}>{initials || '?'}</Text>
    </View>
  );
}

function PostVideo({ url }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
  });
  return (
    <VideoView
      player={player}
      nativeControls
      contentFit="cover"
      style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: 18, backgroundColor: '#000' }}
    />
  );
}

// ---------------- Posts ----------------
function PostComposer({ userId, onPosted }) {
  const st = useStyles();
  const { C } = useCoucouTheme();
  const [body, setBody] = useState('');
  const [media, setMedia] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pickMedia() {
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.8,
      videoMaxDuration: 60,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize && asset.fileSize > MAX_MEDIA_BYTES) {
      setError('Choose a file smaller than 25 MB (videos up to about 1 minute).');
      return;
    }
    setMedia(asset);
  }

  async function publish() {
    if (!userId || busy || (!body.trim() && !media)) return;
    setBusy(true);
    setError('');
    try {
      let mediaUrl = null;
      let mediaType = null;
      if (media) {
        mediaType = media.type === 'video' ? 'video' : 'image';
        const mime =
          media.mimeType || (mediaType === 'video' ? 'video/mp4' : 'image/jpeg');
        const ext = (mime.split('/')[1] || 'bin').replace('quicktime', 'mov').replace('jpeg', 'jpg');
        const bytes = await readBytes(media.uri);
        if (bytes.length > MAX_MEDIA_BYTES) throw new Error('Choose a file smaller than 25 MB.');
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('coucou-posts')
          .upload(path, bytes, { contentType: mime, cacheControl: '3600' });
        if (uploadError) throw uploadError;
        mediaUrl = supabase.storage.from('coucou-posts').getPublicUrl(path).data.publicUrl;
      }
      const { error: insertError } = await supabase.from('posts').insert({
        author_id: userId,
        body: body.trim() || null,
        media_url: mediaUrl,
        media_type: mediaType,
      });
      if (insertError) throw insertError;
      setBody('');
      setMedia(null);
      onPosted();
    } catch (publishError) {
      setError(errorText(publishError, 'Could not publish your post.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={st.card}>
      <TextInput
        accessibilityLabel="Write a post"
        style={[st.input, { minHeight: 70 }]}
        multiline
        value={body}
        onChangeText={setBody}
        placeholder="Share a tip, a photo or a moment from your neighbourhood…"
        placeholderTextColor={C.placeholder}
        maxLength={2000}
      />
      {media && (
        <View style={st.row}>
          <Feather name={media.type === 'video' ? 'video' : 'image'} size={16} color={C.text} />
          <Text style={st.meta}>{media.type === 'video' ? 'Video' : 'Photo'} added</Text>
          <Pill label="Remove" active={false} onPress={() => setMedia(null)} />
        </View>
      )}
      <View style={st.row}>
        <Pill label="Photo / video" icon="image" active={false} onPress={pickMedia} />
        <Pill
          label={busy ? 'Posting…' : 'Post'}
          disabled={busy || (!body.trim() && !media)}
          onPress={publish}
        />
      </View>
      {!!error && <Text style={{ color: C.error }}>{error}</Text>}
    </View>
  );
}

function PostComments({ postId, userId, people, onCount }) {
  const st = useStyles();
  const { C } = useCoucouTheme();
  const [comments, setComments] = useState([]);
  const [names, setNames] = useState({});
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('post_comments')
      .select('id, author_id, body, created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    const rows = data ?? [];
    setComments(rows);
    onCount?.(rows.length);
    const missing = [...new Set(rows.map((r) => r.author_id))].filter((id) => !people[id]);
    if (missing.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', missing);
      setNames(Object.fromEntries((profiles ?? []).map((p) => [p.id, p])));
    }
  }, [postId, people, onCount]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    if (!draft.trim() || busy) return;
    setBusy(true);
    const { error } = await supabase
      .from('post_comments')
      .insert({ post_id: postId, author_id: userId, body: draft.trim() });
    setBusy(false);
    if (!error) {
      setDraft('');
      load();
    }
  }

  return (
    <View style={{ gap: 8 }}>
      {comments.map((c) => {
        const who = people[c.author_id] || names[c.author_id];
        return (
          <View key={c.id} style={[st.row, { alignItems: 'flex-start' }]}>
            <Avatar name={who?.display_name} url={who?.avatar_url} size={28} />
            <View style={{ flex: 1 }}>
              <Text style={st.bold}>
                {who?.display_name ?? 'Neighbour'} <Text style={st.meta}>· {timeAgo(c.created_at)}</Text>
              </Text>
              <Text style={st.body}>{c.body}</Text>
            </View>
          </View>
        );
      })}
      <View style={st.row}>
        <TextInput
          accessibilityLabel="Write a comment"
          style={[st.input, { flex: 1 }]}
          value={draft}
          onChangeText={setDraft}
          placeholder="Write a comment…"
          placeholderTextColor={C.placeholder}
          maxLength={1000}
        />
        <Pill label="Send" disabled={!draft.trim() || busy} onPress={send} />
      </View>
    </View>
  );
}

function PostCard({ post, author, userId, people, commentCount, onDeleted }) {
  const st = useStyles();
  const { C } = useCoucouTheme();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(commentCount ?? 0);
  useEffect(() => setCount(commentCount ?? 0), [commentCount]);

  async function remove() {
    const { error } = await supabase.from('posts').delete().eq('id', post.id);
    if (!error) onDeleted();
  }

  return (
    <View style={st.card}>
      <View style={st.row}>
        <Avatar name={author?.display_name} url={author?.avatar_url} />
        <View style={{ flex: 1 }}>
          <Text style={st.bold}>{author?.display_name ?? 'Neighbour'}</Text>
          <Text style={st.meta}>
            {author?.neighborhood ? author.neighborhood + ' · ' : ''}
            {timeAgo(post.created_at)}
          </Text>
        </View>
        {post.author_id === userId && (
          <Pressable accessibilityRole="button" accessibilityLabel="Delete post" hitSlop={10} onPress={remove}>
            <Feather name="trash-2" size={18} color={C.muted} />
          </Pressable>
        )}
      </View>
      {!!post.body && <Text style={st.body}>{post.body}</Text>}
      {post.media_type === 'image' && (
        <Image
          source={{ uri: post.media_url }}
          style={{ width: '100%', aspectRatio: 4 / 5, borderRadius: 18, backgroundColor: C.track }}
          resizeMode="cover"
          accessibilityLabel="Post photo"
        />
      )}
      {post.media_type === 'video' && <PostVideo url={post.media_url} />}
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(!open)}
        style={[st.row, { paddingVertical: 4 }]}
      >
        <Feather name="message-circle" size={18} color={C.text} />
        <Text style={st.bold}>
          {count ? count + (count === 1 ? ' comment' : ' comments') : 'Comment'}
        </Text>
      </Pressable>
      {open && (
        <PostComments postId={post.id} userId={userId} people={people} onCount={setCount} />
      )}
    </View>
  );
}

function PostsFeed({ userId, blocked }) {
  const st = useStyles();
  const { C } = useCoucouTheme();
  const [posts, setPosts] = useState([]);
  const [people, setPeople] = useState({});
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const { data, error: loadError } = await supabase
        .from('posts')
        .select('id, author_id, body, media_url, media_type, created_at')
        .order('created_at', { ascending: false })
        .limit(40);
      if (loadError) throw loadError;
      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.author_id))];
      const postIds = rows.map((r) => r.id);
      const [{ data: profiles }, { data: comments }] = await Promise.all([
        ids.length
          ? supabase.from('profiles').select('id, display_name, avatar_url, neighborhood').in('id', ids)
          : Promise.resolve({ data: [] }),
        postIds.length
          ? supabase.from('post_comments').select('post_id').in('post_id', postIds)
          : Promise.resolve({ data: [] }),
      ]);
      const countMap = {};
      (comments ?? []).forEach((c) => {
        countMap[c.post_id] = (countMap[c.post_id] ?? 0) + 1;
      });
      setPosts(rows);
      setPeople(Object.fromEntries((profiles ?? []).map((p) => [p.id, p])));
      setCounts(countMap);
    } catch (loadError) {
      setError(errorText(loadError, 'Could not load posts.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('community-posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const visible = posts.filter((p) => !blocked.includes(p.author_id));
  return (
    <View style={{ gap: 14 }}>
      <PostComposer userId={userId} onPosted={load} />
      {loading && !posts.length && <Text style={st.meta}>Loading posts…</Text>}
      {!!error && <Text style={{ color: C.error }}>{error}</Text>}
      {!loading && !visible.length && !error && (
        <Text style={st.body}>No posts yet. Be the first to say coucou!</Text>
      )}
      {visible.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          author={people[post.author_id]}
          userId={userId}
          people={people}
          commentCount={counts[post.id]}
          onDeleted={load}
        />
      ))}
    </View>
  );
}

// ---------------- Clubs ----------------
function CreateClub({ userId, onCreated, onCancel }) {
  const st = useStyles();
  const { C } = useCoucouTheme();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('language');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function create() {
    setBusy(true);
    setError('');
    const { data, error: insertError } = await supabase
      .from('clubs')
      .insert({
        owner_id: userId,
        name: name.trim(),
        category,
        description: description.trim() || null,
      })
      .select('id')
      .single();
    if (insertError) {
      setBusy(false);
      setError(errorText(insertError, 'Could not create the club.'));
      return;
    }
    await supabase.from('club_members').insert({ club_id: data.id, user_id: userId });
    setBusy(false);
    onCreated(data.id);
  }

  return (
    <View style={st.card}>
      <Text style={st.section}>Create a club</Text>
      <TextInput
        accessibilityLabel="Club name"
        style={st.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. French A1 Tandem, Biking in MTL, Winter survival"
        placeholderTextColor={C.placeholder}
        maxLength={80}
      />
      <Text style={st.bold}>Topic</Text>
      <View style={st.row}>
        {CLUB_CATEGORIES.map(([value, label]) => (
          <Pill key={value} label={label} active={category === value} onPress={() => setCategory(value)} />
        ))}
      </View>
      <TextInput
        accessibilityLabel="Club description"
        style={[st.input, { minHeight: 80 }]}
        multiline
        value={description}
        onChangeText={setDescription}
        placeholder="What will the group learn or do together? When do you meet?"
        placeholderTextColor={C.placeholder}
        maxLength={1000}
      />
      <View style={st.row}>
        <Pill
          label={busy ? 'Creating…' : 'Create club'}
          disabled={busy || name.trim().length < 3}
          onPress={create}
        />
        <Pill label="Cancel" active={false} onPress={onCancel} />
      </View>
      {!!error && <Text style={{ color: C.error }}>{error}</Text>}
    </View>
  );
}

function ClubRoom({ club, userId, owner, isMember, memberCount, live, onChanged, onBack }) {
  const st = useStyles();
  const { C } = useCoucouTheme();
  const [messages, setMessages] = useState([]);
  const [names, setNames] = useState({});
  const [draft, setDraft] = useState('');
  const [sessionTitle, setSessionTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef(null);
  const isOwner = club.owner_id === userId;
  const canChat = isOwner || isMember;

  const loadMessages = useCallback(async () => {
    if (!canChat) return;
    const { data } = await supabase
      .from('club_messages')
      .select('id, sender_id, body, created_at')
      .eq('club_id', club.id)
      .order('created_at', { ascending: true })
      .limit(200);
    const rows = data ?? [];
    setMessages(rows);
    const ids = [...new Set(rows.map((r) => r.sender_id))];
    if (ids.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', ids);
      setNames(Object.fromEntries((profiles ?? []).map((p) => [p.id, p])));
    }
  }, [club.id, canChat]);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel('club-' + club.id)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'club_messages', filter: `club_id=eq.${club.id}` },
        () => loadMessages(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'club_sessions', filter: `club_id=eq.${club.id}` },
        () => onChanged(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [club.id, loadMessages, onChanged]);

  async function run(action, fallback) {
    setBusy(true);
    setError('');
    const { error: actionError } = await action();
    setBusy(false);
    if (actionError) setError(errorText(actionError, fallback));
    else onChanged();
  }

  async function send() {
    if (!draft.trim()) return;
    const { error: sendError } = await supabase
      .from('club_messages')
      .insert({ club_id: club.id, sender_id: userId, body: draft.trim() });
    if (sendError) setError(errorText(sendError, 'Could not send.'));
    else {
      setDraft('');
      loadMessages();
    }
  }

  const [roomOpen, setRoomOpen] = useState(false);
  const endLive = useCallback(async () => {
    if (!live) return;
    await supabase
      .from('club_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', live.id);
    onChanged();
  }, [live, onChanged]);

  return (
    <KeyboardAvoidingView style={{ gap: 14 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pill label="‹ All clubs" active={false} onPress={onBack} />
      <View style={st.clubHero}>
        <Text style={st.eyebrow}>{categoryLabel(club.category).toUpperCase()} CLUB</Text>
        <Text style={st.clubTitle}>{club.name}</Text>
        {!!club.description && <Text style={{ color: C.onAccent }}>{club.description}</Text>}
        <View style={st.row}>
          <Avatar name={owner?.display_name} url={owner?.avatar_url} size={30} />
          <Text style={{ color: C.onAccent, fontWeight: '800' }}>
            Run by {owner?.display_name ?? 'a volunteer'} · {memberCount} member{memberCount === 1 ? '' : 's'}
          </Text>
        </View>
      </View>

      {!isOwner && (
        <Pill
          label={isMember ? 'Leave club' : 'Join club'}
          active={!isMember}
          disabled={busy}
          onPress={() =>
            run(
              () =>
                isMember
                  ? supabase.from('club_members').delete().eq('club_id', club.id).eq('user_id', userId)
                  : supabase.from('club_members').insert({ club_id: club.id, user_id: userId }),
              'Could not update your membership.',
            )
          }
        />
      )}

      {live ? (
        <View style={[st.card, { borderColor: C.error, borderWidth: 2 }]}>
          <Text style={[st.bold, { color: C.error }]}>● LIVE NOW · {live.title}</Text>
          <Text style={st.meta}>
            Talk with the club by voice, right here in the app, like a language tandem.
            {isOwner ? ' You are the host.' : ''}
          </Text>
          {canChat ? (
            <Pill
              label={isOwner ? 'Open the live room (host)' : 'Join the live room'}
              icon="mic"
              onPress={() => setRoomOpen(true)}
            />
          ) : (
            <Text style={st.meta}>Join the club to take part.</Text>
          )}
          {isOwner && (
            <Pill
              label="End live session"
              active={false}
              disabled={busy}
              onPress={() =>
                run(
                  () =>
                    supabase
                      .from('club_sessions')
                      .update({ ended_at: new Date().toISOString() })
                      .eq('id', live.id),
                  'Could not end the session.',
                )
              }
            />
          )}
        </View>
      ) : (
        isOwner && (
          <View style={st.card}>
            <Text style={st.bold}>Start a live session</Text>
            <TextInput
              accessibilityLabel="Session title"
              style={st.input}
              value={sessionTitle}
              onChangeText={setSessionTitle}
              placeholder="e.g. Thursday French practice"
              placeholderTextColor={C.placeholder}
              maxLength={120}
            />
            <Pill
              label="Go live"
              icon="radio"
              disabled={busy || sessionTitle.trim().length < 2}
              onPress={() =>
                run(
                  () =>
                    supabase.from('club_sessions').insert({
                      club_id: club.id,
                      started_by: userId,
                      title: sessionTitle.trim(),
                    }),
                  'Could not start the session.',
                )
              }
            />
          </View>
        )
      )}

      {canChat ? (
        <View style={st.card}>
          <Text style={st.section}>Club chat</Text>
          <ScrollView
            ref={scrollRef}
            style={{ maxHeight: 340 }}
            contentContainerStyle={{ gap: 8 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
          >
            {!messages.length && <Text style={st.meta}>Say bonjour to the club!</Text>}
            {messages.map((m) => {
              const mine = m.sender_id === userId;
              return (
                <View key={m.id} style={[st.bubble, mine && st.bubbleMine]}>
                  {!mine && (
                    <Text style={[st.meta, { color: C.onAccentMuted }]}>
                      {names[m.sender_id]?.display_name ?? 'Member'}
                    </Text>
                  )}
                  <Text style={{ color: C.onAccent, fontSize: 15 }}>{m.body}</Text>
                </View>
              );
            })}
          </ScrollView>
          <View style={st.row}>
            <TextInput
              accessibilityLabel="Message the club"
              style={[st.input, { flex: 1 }]}
              value={draft}
              onChangeText={setDraft}
              placeholder="Message the club…"
              placeholderTextColor={C.placeholder}
              maxLength={1000}
            />
            <Pill label="Send" disabled={!draft.trim()} onPress={send} />
          </View>
        </View>
      ) : (
        <Text style={st.meta}>Join the club to see the chat and live sessions.</Text>
      )}
      {!!error && <Text style={{ color: C.error }}>{error}</Text>}
      {live && (
        <LiveRoom
          visible={roomOpen}
          club={club}
          live={live}
          userId={userId}
          onEnd={endLive}
          onClose={(reason) => {
            setRoomOpen(false);
            if (reason === 'kicked') setError('The host removed you from this live session.');
            if (reason === 'ended') setError('The host ended the live session.');
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

function Clubs({ userId, role, blocked }) {
  const st = useStyles();
  const { C } = useCoucouTheme();
  const [clubs, setClubs] = useState([]);
  const [owners, setOwners] = useState({});
  const [members, setMembers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [filter, setFilter] = useState('');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const canCreate = role === 'volunteer' || role === 'both';

  const load = useCallback(async () => {
    setError('');
    try {
      const [{ data: clubRows, error: clubError }, { data: memberRows }, { data: liveRows }] =
        await Promise.all([
          supabase.from('clubs').select('id, owner_id, name, category, description, created_at').order('created_at', { ascending: false }),
          supabase.from('club_members').select('club_id, user_id'),
          supabase.from('club_sessions').select('id, club_id, title, room_code, started_at').is('ended_at', null),
        ]);
      if (clubError) throw clubError;
      const ownerIds = [...new Set((clubRows ?? []).map((c) => c.owner_id))];
      const { data: ownerRows } = ownerIds.length
        ? await supabase.from('profiles').select('id, display_name, avatar_url').in('id', ownerIds)
        : { data: [] };
      setClubs(clubRows ?? []);
      setMembers(memberRows ?? []);
      setSessions(liveRows ?? []);
      setOwners(Object.fromEntries((ownerRows ?? []).map((p) => [p.id, p])));
    } catch (loadError) {
      setError(errorText(loadError, 'Could not load clubs.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('community-clubs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'club_sessions' }, () => load())
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  const countFor = (id) => members.filter((m) => m.club_id === id).length;
  const liveFor = (id) => sessions.find((x) => x.club_id === id);
  const opened = clubs.find((c) => c.id === openId);

  if (opened) {
    return (
      <ClubRoom
        club={opened}
        userId={userId}
        owner={owners[opened.owner_id]}
        isMember={members.some((m) => m.club_id === opened.id && m.user_id === userId)}
        memberCount={countFor(opened.id)}
        live={liveFor(opened.id)}
        onChanged={load}
        onBack={() => setOpenId(null)}
      />
    );
  }

  const visible = clubs
    .filter((c) => !blocked.includes(c.owner_id))
    .filter((c) => !filter || c.category === filter)
    .sort((a, b) => Number(!!liveFor(b.id)) - Number(!!liveFor(a.id)));

  return (
    <View style={{ gap: 14 }}>
      {canCreate &&
        (creating ? (
          <CreateClub
            userId={userId}
            onCancel={() => setCreating(false)}
            onCreated={(id) => {
              setCreating(false);
              load().then(() => setOpenId(id));
            }}
          />
        ) : (
          <Pill label="+ Create a club" onPress={() => setCreating(true)} />
        ))}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Pill label="All" active={!filter} onPress={() => setFilter('')} />
        {CLUB_CATEGORIES.map(([value, label]) => (
          <Pill key={value} label={label} active={filter === value} onPress={() => setFilter(value)} />
        ))}
      </ScrollView>
      {loading && !clubs.length && <Text style={st.meta}>Loading clubs…</Text>}
      {!!error && <Text style={{ color: C.error }}>{error}</Text>}
      {!loading && !visible.length && !error && (
        <Text style={st.body}>
          No clubs yet.{canCreate ? ' Start the first one!' : ' Volunteers will open clubs soon.'}
        </Text>
      )}
      {visible.map((club) => {
        const live = liveFor(club.id);
        const joined = members.some((m) => m.club_id === club.id && m.user_id === userId);
        return (
          <Pressable
            key={club.id}
            accessibilityRole="button"
            onPress={() => setOpenId(club.id)}
            style={({ pressed }) => [st.card, pressed && { opacity: 0.8 }]}
          >
            <View style={st.row}>
              <Text style={[st.meta, { flex: 1 }]}>{categoryLabel(club.category).toUpperCase()}</Text>
              {live && <Text style={[st.bold, { color: C.error }]}>● LIVE</Text>}
              {joined && !live && <Feather name="check-circle" size={16} color={C.success} />}
            </View>
            <Text style={st.cardTitle}>{club.name}</Text>
            {!!club.description && (
              <Text style={st.body} numberOfLines={2}>
                {club.description}
              </Text>
            )}
            <View style={st.row}>
              <Avatar name={owners[club.owner_id]?.display_name} url={owners[club.owner_id]?.avatar_url} size={26} />
              <Text style={st.meta}>
                {owners[club.owner_id]?.display_name ?? 'Volunteer'} · {countFor(club.id)} member
                {countFor(club.id) === 1 ? '' : 's'}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ---------------- Discover ----------------
export default function Community({ userId, role, blocked = [], renderPeople, language = 'en' }) {
  const [section, setSection] = useState('Posts');
  const st = useStyles();
  const t = STRINGS[language];
  return (
    <View style={{ gap: 14 }}>
      <Text style={st.title}>{t.discover}</Text>
      <View style={st.row}>
        {['Posts', 'Clubs', 'People'].map((name) => (
          <Pill key={name} label={t.discoverSections[name]} active={section === name} onPress={() => setSection(name)} />
        ))}
      </View>
      {!userId ? (
        <Text style={st.meta}>Loading…</Text>
      ) : section === 'Posts' ? (
        <PostsFeed userId={userId} blocked={blocked} />
      ) : section === 'Clubs' ? (
        <Clubs userId={userId} role={role} blocked={blocked} />
      ) : (
        renderPeople()
      )}
    </View>
  );
}

const useStyles = makeStyles((C) => ({
  title: { fontSize: 34, fontWeight: '900', color: C.text, letterSpacing: -1.5 },
  section: { fontSize: 20, fontWeight: '900', color: C.text, letterSpacing: -0.5 },
  cardTitle: { fontSize: 18, fontWeight: '900', color: C.text },
  bold: { color: C.text, fontWeight: '700' },
  body: { color: C.text, fontSize: 15, lineHeight: 21 },
  meta: { color: C.muted, fontWeight: '700', fontSize: 13 },
  eyebrow: { color: C.onAccent, fontSize: 12, fontWeight: '800', letterSpacing: 2 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  card: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 16,
    gap: 10,
  },
  input: {
    backgroundColor: C.inputBg,
    borderColor: C.inputBorder,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: C.text,
    fontSize: 15,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.primary,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  pillSoft: { backgroundColor: C.softBg },
  pillText: { color: C.onPrimary, fontWeight: '800', fontSize: 14 },
  pillTextSoft: { color: C.softText },
  clubHero: { backgroundColor: C.yellow, borderRadius: 26, padding: 20, gap: 8 },
  clubTitle: { color: C.onAccent, fontSize: 32, lineHeight: 34, fontWeight: '900', letterSpacing: -1 },
  bubble: {
    backgroundColor: C.lilac,
    borderRadius: 16,
    padding: 10,
    alignSelf: 'flex-start',
    maxWidth: '85%',
  },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: C.yellow },
}));
