import { useMemo, useState } from 'react';
import { Box, Button, Card, CardContent, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, Tab, Tabs, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import { listMasterSongs, type MasterDatabase } from '../data/master-database';
import { listSongs, type LessonDatabase } from '../data/lesson-database';
import {
  MESSAGE_SITUATIONS, addMasterMessage, assignMessage, listMasterMessages,
  listMessageAssignments, loadMessageDatabase, removeMessageAssignment,
  saveMessageDatabase, softDeleteMasterMessage, updateMasterMessage,
  type MessageDatabase, type MessageScope, type MessageSituation,
} from '../data/message-database';

type Props = { masterDatabase: MasterDatabase; lessonDatabase: LessonDatabase };

export default function MessageManagement({ masterDatabase, lessonDatabase }: Props) {
  const [database, setDatabase] = useState<MessageDatabase>(() => loadMessageDatabase(window.localStorage));
  const [situation, setSituation] = useState<MessageSituation>('start');
  const [scope, setScope] = useState<MessageScope>('situation');
  const [songId, setSongId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [query, setQuery] = useState('');
  const [dialog, setDialog] = useState<'add' | 'edit' | 'choose' | null>(null);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState('');
  const [error, setError] = useState('');
  const songs = useMemo(() => listMasterSongs(masterDatabase), [masterDatabase]);
  const lessonSongs = useMemo(() => listSongs(lessonDatabase), [lessonDatabase]);
  const selectedSongTopics = lessonSongs.find(item => item.id === songId)?.exercises ?? [];
  const scoped = situation === 'start' || situation === 'done';
  const targetId = scope === 'song' ? songId : scope === 'topic' ? topicId : null;
  const validTarget = scope === 'situation' || Boolean(targetId);
  const assignments = listMessageAssignments(database, situation, scope, targetId);
  const messages = listMasterMessages(database, query);
  const commit = (next: MessageDatabase) => {
    setDatabase(next);
    saveMessageDatabase(next, window.localStorage);
  };
  const chooseSituation = (next: MessageSituation) => {
    setSituation(next);
    setScope('situation');
    setSongId('');
    setTopicId('');
    setQuery('');
  };
  const beginAdd = () => { if (!validTarget) { setError('先に曲とお題を選択してください。'); return; } setDraft(''); setError(''); setDialog('add'); };
  const saveNew = () => {
    if (!draft.trim()) { setError('文章を入力してください。'); return; }
    let next = addMasterMessage(database, draft);
    const added = listMasterMessages(next).find(item => !database.messages.some(old => old.id === item.id));
    if (!added) return;
    if (validTarget) next = assignMessage(next, added.id, situation, scope, targetId);
    commit(next);
    setDialog(null);
    setQuery('');
  };
  const addExisting = (messageId: string) => {
    if (!validTarget) return;
    commit(assignMessage(database, messageId, situation, scope, targetId));
    setDialog(null);
  };
  const saveEdit = () => {
    if (!draft.trim()) { setError('文章を入力してください。'); return; }
    commit(updateMasterMessage(database, editingId, draft));
    setDialog(null);
  };
  const startEdit = (id: string, text: string) => {
    setEditingId(id); setDraft(text); setError(''); setDialog('edit');
  };
  const removeAssignment = (id: string) => {
    const next = removeMessageAssignment(database, id);
    if (next === database) { setError('共通メッセージは最低1件必要です。'); return; }
    commit(next); setError('');
  };
  const deleteMaster = (id: string) => {
    const next = softDeleteMasterMessage(database, id);
    if (next === database) { setError('使用中の文章は削除できません。先にすべての割り当てを解除してください。'); return; }
    commit(next); setError('');
  };

  return <Stack spacing={2}>
    <Typography variant="h5" fontWeight={800}>メッセージ設定</Typography>
    <Typography color="text.secondary">状況を選んで、もにちゃんのセリフを設定しよう。</Typography>
    <Stack spacing={1}>
      {MESSAGE_SITUATIONS.map(item => <Button key={item.id} fullWidth variant={situation === item.id ? 'contained' : 'outlined'} onClick={() => chooseSituation(item.id)} sx={{ justifyContent: 'space-between', py: 1.2, borderRadius: 2 }}>
        <Box sx={{ textAlign: 'left' }}><Typography fontWeight={800}>{item.id === 'start' ? 'レッスン開始' : item.id === 'done' ? 'できた！' : item.id === 'topic-goal' ? 'お題の目標達成' : item.id === 'song-complete' ? '曲の目標達成' : '今日のレッスン達成'}</Typography><Typography variant="caption" sx={{ opacity: .8 }}>{item.defaultText}</Typography></Box>
        <Typography variant="caption">{listMessageAssignments(database, item.id, 'situation').length}件</Typography>
      </Button>)}
    </Stack>
    <Card variant="outlined" sx={{ borderColor: '#eadcf1', borderRadius: 3 }}>
      <CardContent>
        <Typography variant="h6" fontWeight={800}>{MESSAGE_SITUATIONS.find(item => item.id === situation)?.label} のメッセージ</Typography>
        {scoped && <Tabs value={scope} onChange={(_, value: MessageScope) => { setScope(value); setError(''); }} variant="fullWidth" sx={{ mb: 2 }}>
          <Tab value="situation" label="共通" />
          <Tab value="song" label="曲ごと" />
          <Tab value="topic" label="お題ごと" />
        </Tabs>}
        {scope === 'song' && <TextField select fullWidth size="small" label="曲を選択" value={songId} onChange={e => setSongId(e.target.value)} sx={{ mb: 2 }}>
          <MenuItem value="">選択してください</MenuItem>{songs.map(item => <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>)}
        </TextField>}
        {scope === 'topic' && <Stack spacing={1} sx={{ mb: 2 }}>
          <TextField select fullWidth size="small" label="曲を選択" value={songId} onChange={e => { setSongId(e.target.value); setTopicId(''); }}>
            <MenuItem value="">選択してください</MenuItem>{songs.map(item => <MenuItem key={item.id} value={item.id}>{item.title}</MenuItem>)}
          </TextField>
          <TextField select fullWidth size="small" label="お題を選択" value={topicId} onChange={e => setTopicId(e.target.value)} disabled={!songId}>
            <MenuItem value="">選択してください</MenuItem>{selectedSongTopics.map(item => <MenuItem key={item.topicId} value={item.topicId}>{item.topicTitle}</MenuItem>)}
          </TextField>
          <Typography variant="caption" color="text.secondary">選択した曲に登録されているお題を表示しています。</Typography>
        </Stack>}
        {!validTarget ? <Typography color="text.secondary">曲とお題を選ぶと設定を表示します。</Typography> : assignments.length === 0 ? <Typography color="text.secondary" sx={{ my: 2 }}>この場所に専用メッセージはありません。共通メッセージが使われます。</Typography> : <Stack spacing={1} sx={{ mt: 1 }}>
          {assignments.map(item => <Box key={item.id} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, border: '1px solid #eee4f2', borderRadius: 2, p: 1.5 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}><Typography sx={{ overflowWrap: 'anywhere' }}>{item.text}</Typography><Typography variant="caption" color="text.secondary">{item.isDefault ? '初期メッセージ' : '登録済みメッセージ'}</Typography></Box>
            <IconButton aria-label="文章を編集" onClick={() => startEdit(item.messageId, item.text)}><EditIcon /></IconButton>
            <IconButton aria-label="割り当てを解除" onClick={() => removeAssignment(item.id)}><DeleteOutlineIcon /></IconButton>
          </Box>)}
        </Stack>}
        {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button fullWidth variant="outlined" startIcon={<AddIcon />} onClick={beginAdd}>新しい文章</Button>
          <Button fullWidth variant="contained" onClick={() => { setQuery(''); setDialog('choose'); }}>登録済みから追加</Button>
        </Stack>
      </CardContent>
    </Card>
    <Typography variant="caption" color="text.secondary">文章の編集は、その文章を使っているすべての場所に反映されます。割り当て解除では文章自体は削除されません。</Typography>
    <Dialog open={dialog === 'add' || dialog === 'edit'} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
      <DialogTitle>{dialog === 'edit' ? '文章を編集' : '新しいメッセージ'}</DialogTitle>
      <DialogContent><TextField autoFocus fullWidth multiline minRows={3} margin="dense" label="もにちゃんのセリフ" value={draft} onChange={e => setDraft(e.target.value)} error={Boolean(error)} helperText={error || '文章を編集すると、使用中のすべての設定に反映されます。'} /></DialogContent>
      <DialogActions><Button onClick={() => setDialog(null)}>キャンセル</Button><Button variant="contained" onClick={dialog === 'edit' ? saveEdit : saveNew}>保存</Button></DialogActions>
    </Dialog>
    <Dialog open={dialog === 'choose'} onClose={() => setDialog(null)} fullWidth maxWidth="sm">
      <DialogTitle>登録済みの文章から追加</DialogTitle>
      <DialogContent><TextField fullWidth size="small" margin="dense" placeholder="文章を検索…" value={query} onChange={e => setQuery(e.target.value)} />
        <Stack spacing={1} sx={{ mt: 1 }}>{messages.map(item => {
          const already = assignments.some(assignment => assignment.messageId === item.id);
          return <Box key={item.id} sx={{ border: '1px solid #eee4f2', borderRadius: 2, p: 1.5 }}>
            <Typography>{item.text}</Typography>
            <Stack direction="row" justifyContent="flex-end" spacing={1}>
              <Button size="small" onClick={() => startEdit(item.id, item.text)}>編集</Button>
              <Button size="small" color="error" onClick={() => deleteMaster(item.id)}>文章を削除</Button>
              <Button size="small" variant="contained" disabled={already || !validTarget} onClick={() => addExisting(item.id)}>追加</Button>
            </Stack>
          </Box>;
        })}{messages.length === 0 && <Typography color="text.secondary">該当する文章がありません。</Typography>}</Stack>
        {error && <Typography color="error" variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
      </DialogContent><DialogActions><Button onClick={() => setDialog(null)}>閉じる</Button></DialogActions>
    </Dialog>
  </Stack>;
}
