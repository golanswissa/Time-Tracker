import { useUI } from '../ui';

/**
 * Right-side assistant rail — Phase 1 STUB.
 * Renders the conversation surface + paste box; the real AI (parse/triage)
 * is wired in Phase 2 via /api/ai. For now the box is a placeholder.
 */
export function ChatRail() {
  const chatOpen = useUI((s) => s.chatOpen);
  const toggleChat = useUI((s) => s.toggleChat);

  return (
    <aside className={`wk-chat ${chatOpen ? 'on' : ''}`}>
      <div className="wk-cp-in">
        <div className="wk-cp-h">
          <span>Assistant</span>
          <button className="x" onClick={toggleChat} aria-label="Close">×</button>
        </div>
        <div className="wk-cp-s">
          <div className="wk-m ai">
            <div className="who">Traffic</div>
            <div className="wk-cp-note">
              Paste a message or screenshot and I'll turn it into tasks, filed under the right
              project — with a quick confirm before anything lands.
              <br /><br />
              <em>Coming in the next step — the box below is a placeholder for now.</em>
            </div>
          </div>
        </div>
        <div className="wk-cp-box">
          <div className="b">Dump anything — text or a screenshot…<span className="s">↑</span></div>
        </div>
      </div>
    </aside>
  );
}
