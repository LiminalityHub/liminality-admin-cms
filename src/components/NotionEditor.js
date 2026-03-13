import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, Node as TiptapNode } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import Image from '@tiptap/extension-image';
import './NotionEditor.css';

/* ── YouTube URL helper ───────────────────────────────────────────── */
function extractYouTubeId(url) {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/
  );
  return match ? match[1] : null;
}

/* ── YouTube custom node ──────────────────────────────────────────── */
const YouTube = TiptapNode.create({
  name: 'youtube',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      videoId: { default: null },
    };
  },

  parseHTML() {
    return [{
      tag: 'div[data-youtube]',
      getAttrs: (el) => ({ videoId: el.getAttribute('data-youtube') }),
    }];
  },

  renderHTML({ node }) {
    const id = node.attrs.videoId;
    return ['div', { 'data-youtube': id, class: 'notion-youtube-wrap', 'data-node-view-wrapper': '' },
      ['iframe', {
        src: `https://www.youtube.com/embed/${id}`,
        frameborder: '0',
        allowfullscreen: 'true',
        allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      }],
    ];
  },
});

/* ── Hidden file picker for images ────────────────────────────────── */
function pickImageFile() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    };
    input.click();
  });
}


/* ── Block type items (for "Turn into" menu) ─────────────────────── */
const BLOCK_TYPES = [
  { label: 'Text',           icon: 'Aa',  action: (e) => e.chain().focus().setParagraph().run() },
  { label: 'Heading 1',      icon: 'H1',  action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2',      icon: 'H2',  action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3',      icon: 'H3',  action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Bullet List',    icon: '•',   action: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered List',  icon: '1.',  action: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Quote',          icon: '"',   action: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Code Block',     icon: '</>',  action: (e) => e.chain().focus().toggleCodeBlock().run() },
];

function getActiveBlockType(editor) {
  if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
  if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
  if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
  if (editor.isActive('bulletList')) return 'Bullet List';
  if (editor.isActive('orderedList')) return 'Numbered List';
  if (editor.isActive('blockquote')) return 'Quote';
  if (editor.isActive('codeBlock')) return 'Code Block';
  return 'Text';
}

/* ── Slash-command menu items ─────────────────────────────────────── */
const SLASH_ITEMS = [
  { label: 'Text',           icon: 'Aa',  action: (e) => e.chain().focus().setParagraph().run() },
  { label: 'Heading 1',      icon: 'H1',  action: (e) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Heading 2',      icon: 'H2',  action: (e) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Heading 3',      icon: 'H3',  action: (e) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Bullet List',    icon: '•',   action: (e) => e.chain().focus().toggleBulletList().run() },
  { label: 'Numbered List',  icon: '1.',  action: (e) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Quote',          icon: '"',   action: (e) => e.chain().focus().toggleBlockquote().run() },
  { label: 'Code Block',     icon: '</>',  action: (e) => e.chain().focus().toggleCodeBlock().run() },
  { label: 'Divider',        icon: '—',   action: (e) => e.chain().focus().setHorizontalRule().run() },
  { label: 'Image',          icon: '🖼',  action: async (e) => {
    const dataUrl = await pickImageFile();
    if (dataUrl) e.chain().focus().setImage({ src: dataUrl }).run();
  }},
  { label: 'YouTube Video',  icon: '▶',  action: (e) => {
    const url = window.prompt('Paste YouTube URL');
    if (!url) return;
    const id = extractYouTubeId(url);
    if (!id) { window.alert('Could not find a valid YouTube video ID in that URL.'); return; }
    const { tr, schema } = e.state;
    const nodeType = schema.nodes.youtube;
    if (nodeType) {
      e.view.dispatch(tr.replaceSelectionWith(nodeType.create({ videoId: id })));
    }
  }},
];

/* ── Slash command menu component ─────────────────────────────────── */
function SlashMenu({ query, onSelect, position, selectedIndex }) {
  const filtered = SLASH_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase())
  );

  if (filtered.length === 0) return null;

  return (
    <div className="notion-slash-menu" style={{ top: position.top, left: position.left }}>
      {filtered.map((item, i) => (
        <button
          key={item.label}
          className={`notion-slash-item ${i === selectedIndex ? 'active' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); onSelect(item); }}
        >
          <span className="notion-slash-icon">{item.icon}</span>
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

/* ── Main editor ──────────────────────────────────────────────────── */
export default function NotionEditor({ value, onChange }) {
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashQuery, setSlashQuery] = useState('');
  const [slashPos, setSlashPos] = useState({ top: 0, left: 0 });
  const [slashIndex, setSlashIndex] = useState(0);
  const slashStartPos = useRef(null);

  // Floating toolbar state
  const [toolbarVisible, setToolbarVisible] = useState(false);
  const [toolbarPos, setToolbarPos] = useState({ top: 0, left: 0 });

  // Block handle state
  const [handlePos, setHandlePos] = useState({ top: 0 });
  const [handleVisible, setHandleVisible] = useState(false);
  const [blockMenuOpen, setBlockMenuOpen] = useState(false);
  const blockMenuRef = useRef(null);

  // Drag-to-reorder state
  const dragInfo = useRef({ active: false, sourceIndex: -1, targetIndex: -1 });
  const [dropLine, setDropLine] = useState(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Type '/' for commands…",
      }),
      Underline,
      Image.configure({ inline: false }),
      YouTube,
    ],
    content: value || '',
    onUpdate({ editor: ed }) {
      onChange(ed.getHTML());
    },
    onCreate({ editor: ed }) {
      // Debug: verify youtube node registered
      console.log('Editor schema nodes:', Object.keys(ed.state.schema.nodes));
    },
  });

  // Compute filtered items for keyboard nav
  const filteredItems = SLASH_ITEMS.filter((item) =>
    item.label.toLowerCase().includes(slashQuery.toLowerCase())
  );

  const closeSlash = useCallback(() => {
    setSlashOpen(false);
    setSlashQuery('');
    setSlashIndex(0);
    slashStartPos.current = null;
  }, []);

  const selectSlashItem = useCallback((item) => {
    if (!editor) return;
    const from = slashStartPos.current;
    const to = editor.state.selection.from;
    editor.chain().focus().deleteRange({ from, to }).run();
    item.action(editor);
    closeSlash();
  }, [editor, closeSlash]);

  // Handle slash trigger and navigation
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (event) => {
      if (slashOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          setSlashIndex((i) => (i + 1) % filteredItems.length);
          return;
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault();
          setSlashIndex((i) => (i - 1 + filteredItems.length) % filteredItems.length);
          return;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          if (filteredItems[slashIndex]) {
            selectSlashItem(filteredItems[slashIndex]);
          }
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          closeSlash();
          return;
        }
      }
    };

    const editorEl = editor.view.dom;
    editorEl.addEventListener('keydown', handleKeyDown);
    return () => editorEl.removeEventListener('keydown', handleKeyDown);
  }, [editor, slashOpen, slashIndex, filteredItems, selectSlashItem, closeSlash]);

  // Watch for slash character input
  useEffect(() => {
    if (!editor) return;

    const handleTransaction = () => {
      const { state } = editor;
      const { from } = state.selection;
      const textBefore = state.doc.textBetween(
        Math.max(0, from - 50),
        from,
        '\n'
      );

      const lastSlash = textBefore.lastIndexOf('/');
      if (lastSlash !== -1) {
        const afterSlash = textBefore.slice(lastSlash + 1);
        const charBefore = lastSlash > 0 ? textBefore[lastSlash - 1] : '\n';
        if (charBefore === '\n' || charBefore === ' ' || lastSlash === 0) {
          if (!/\s/.test(afterSlash)) {
            const absoluteSlashPos = from - textBefore.length + lastSlash;
            if (!slashOpen) {
              slashStartPos.current = absoluteSlashPos;
              const coords = editor.view.coordsAtPos(from);
              const editorRect = editor.view.dom.getBoundingClientRect();
              setSlashPos({
                top: coords.bottom - editorRect.top + 4,
                left: coords.left - editorRect.left,
              });
            }
            setSlashQuery(afterSlash);
            setSlashIndex(0);
            setSlashOpen(true);
            return;
          }
        }
      }

      if (slashOpen) closeSlash();
    };

    editor.on('transaction', handleTransaction);
    return () => editor.off('transaction', handleTransaction);
  }, [editor, slashOpen, closeSlash]);

  // Track current block for the handle button
  useEffect(() => {
    if (!editor) return;

    const updateHandle = () => {
      const { from } = editor.state.selection;
      const resolvedPos = editor.state.doc.resolve(from);
      const blockStart = resolvedPos.start(1);
      try {
        const coords = editor.view.coordsAtPos(blockStart);
        const editorRect = editor.view.dom.closest('.notion-editor-wrap').getBoundingClientRect();
        setHandlePos({ top: coords.top - editorRect.top });
        setHandleVisible(true);
      } catch {
        setHandleVisible(false);
      }
    };

    editor.on('selectionUpdate', updateHandle);
    editor.on('focus', updateHandle);
    return () => {
      editor.off('selectionUpdate', updateHandle);
      editor.off('focus', updateHandle);
    };
  }, [editor]);

  // Close block menu on outside click
  useEffect(() => {
    if (!blockMenuOpen) return;
    const handleClick = (e) => {
      if (blockMenuRef.current && !blockMenuRef.current.contains(e.target)) {
        setBlockMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [blockMenuOpen]);

  // Drag-to-reorder: mousedown on handle starts tracking
  const handleHandleMouseDown = useCallback((e) => {
    if (!editor) return;
    e.preventDefault();
    const startY = e.clientY;
    let dragged = false;

    // Find which top-level block the cursor is in
    const { from } = editor.state.selection;
    const doc = editor.state.doc;
    let pos = 0;
    let sourceIndex = -1;
    for (let i = 0; i < doc.childCount; i++) {
      if (from >= pos && from < pos + doc.child(i).nodeSize) { sourceIndex = i; break; }
      pos += doc.child(i).nodeSize;
    }
    if (sourceIndex === -1) return;

    const onMouseMove = (moveEvent) => {
      if (!dragged && Math.abs(moveEvent.clientY - startY) > 5) {
        dragged = true;
        setBlockMenuOpen(false);
        dragInfo.current = { active: true, sourceIndex, targetIndex: sourceIndex };
        document.body.style.cursor = 'grabbing';
      }
      if (!dragged) return;

      const mouseY = moveEvent.clientY;
      const wrapEl = editor.view.dom.closest('.notion-editor-wrap');
      const wrapRect = wrapEl.getBoundingClientRect();
      const currentDoc = editor.state.doc;

      let p = 0;
      let bestDist = Infinity;
      let bestIdx = 0;
      let bestTop = 0;

      for (let i = 0; i < currentDoc.childCount; i++) {
        const dom = editor.view.nodeDOM(p);
        if (dom && dom.getBoundingClientRect) {
          const rect = dom.getBoundingClientRect();
          const topDist = Math.abs(rect.top - mouseY);
          if (topDist < bestDist) { bestDist = topDist; bestIdx = i; bestTop = rect.top - wrapRect.top; }
          const botDist = Math.abs(rect.bottom - mouseY);
          if (botDist < bestDist) { bestDist = botDist; bestIdx = i + 1; bestTop = rect.bottom - wrapRect.top; }
        }
        p += currentDoc.child(i).nodeSize;
      }

      dragInfo.current.targetIndex = bestIdx;
      setDropLine({ top: bestTop });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';

      if (!dragged) {
        // It was a click, not a drag — toggle the menu
        setBlockMenuOpen((v) => !v);
        return;
      }

      setDropLine(null);
      const { sourceIndex: src, targetIndex: tgt } = dragInfo.current;
      dragInfo.current.active = false;

      if (tgt === src || tgt === src + 1) return; // no move needed

      // Move the block
      const doc = editor.state.doc;
      const tr = editor.state.tr;
      let srcPos = 0;
      for (let i = 0; i < src; i++) srcPos += doc.child(i).nodeSize;
      const srcNode = doc.child(src);

      tr.delete(srcPos, srcPos + srcNode.nodeSize);

      const adjustedIdx = tgt > src ? tgt - 1 : tgt;
      let tgtPos = 0;
      for (let i = 0; i < adjustedIdx; i++) tgtPos += tr.doc.child(i).nodeSize;

      tr.insert(tgtPos, srcNode);
      editor.view.dispatch(tr);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [editor]);

  // Watch for text selection to show/hide floating toolbar
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      const { from, to } = editor.state.selection;
      if (from === to) {
        setToolbarVisible(false);
        return;
      }
      const coords = editor.view.coordsAtPos(from);
      const editorRect = editor.view.dom.closest('.notion-editor-wrap').getBoundingClientRect();
      setToolbarPos({
        top: coords.top - editorRect.top - 44,
        left: coords.left - editorRect.left,
      });
      setToolbarVisible(true);
    };

    editor.on('selectionUpdate', handleSelectionUpdate);
    editor.on('blur', () => setToolbarVisible(false));
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
      editor.off('blur', () => setToolbarVisible(false));
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="notion-editor-wrap">
      {/* Floating toolbar on text selection */}
      {toolbarVisible && (
        <div className="notion-bubble-menu" style={{ top: toolbarPos.top, left: toolbarPos.left }}>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
            className={editor.isActive('bold') ? 'is-active' : ''}
          >B</button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
            className={editor.isActive('italic') ? 'is-active' : ''}
          ><em>I</em></button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
            className={editor.isActive('underline') ? 'is-active' : ''}
          ><u>U</u></button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
            className={editor.isActive('strike') ? 'is-active' : ''}
          ><s>S</s></button>
          <button
            onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleCode().run(); }}
            className={editor.isActive('code') ? 'is-active' : ''}
          >&lt;/&gt;</button>
        </div>
      )}

      {/* Block handle + Turn into menu */}
      {handleVisible && (
        <div className="notion-block-handle" style={{ top: handlePos.top }}>
          <button
            type="button"
            className="notion-block-handle-btn"
            onMouseDown={handleHandleMouseDown}
            title="Click to turn into… / Drag to reorder"
          >
            ⋮⋮
          </button>
          {blockMenuOpen && (
            <div className="notion-block-menu" ref={blockMenuRef}>
              <div className="notion-block-menu-label">Turn into</div>
              {BLOCK_TYPES.map((item) => (
                <button
                  type="button"
                  key={item.label}
                  className={`notion-slash-item ${getActiveBlockType(editor) === item.label ? 'active' : ''}`}
                  onClick={() => {
                    item.action(editor);
                    setBlockMenuOpen(false);
                  }}
                >
                  <span className="notion-slash-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Drop indicator line */}
      {dropLine && <div className="notion-drop-line" style={{ top: dropLine.top }} />}

      {/* Editor content */}
      <EditorContent editor={editor} className="notion-editor" />

      {/* Slash command menu */}
      {slashOpen && (
        <SlashMenu
          query={slashQuery}
          onSelect={selectSlashItem}
          position={slashPos}
          selectedIndex={slashIndex}
        />
      )}
    </div>
  );
}
