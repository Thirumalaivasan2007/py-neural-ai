import { MessageSquare, LogOut, Clock, BrainCircuit, X, Trash2 } from 'lucide-react';

const Sidebar = ({ history, logout, user, close, loadSession, startNewChat, currentSessionId, deleteSession }) => {
    return (
        <div className="w-72 h-full bg-slate-950 border-r border-slate-800 flex flex-col text-slate-300">
            <div className="p-5 flex items-center justify-between border-b border-slate-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white">
                        <BrainCircuit size={18} />
                    </div>
                    <span className="font-bold text-lg text-white">Nexora AI</span>
                </div>
                <button onClick={close} className="lg:hidden p-1 hover:bg-slate-800 rounded">
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3">
                <button
                    onClick={startNewChat}
                    className="w-full mb-6 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-all shadow-lg hover:shadow-blue-900/20"
                >
                    <MessageSquare size={18} />
                    New Chat
                </button>

                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-3 flex items-center gap-2">
                    <Clock size={14} />
                    Recent Conversations
                </div>

                <div className="space-y-1">
                    {history.length === 0 ? (
                        <div className="text-sm text-slate-500 px-3 italic py-4">No chat history yet</div>
                    ) : (
                        history.map((chat) => (
                            <div
                                key={chat.sessionId}
                                onClick={() => loadSession(chat.sessionId)}
                                className={`w-full text-left px-3 py-3 rounded-lg hover:bg-slate-800 transition-all cursor-pointer group flex items-start justify-between gap-3 ${currentSessionId === chat.sessionId ? 'bg-slate-800 border border-slate-700 shadow-sm' : 'border border-transparent'}`}
                            >
                                <div className="flex items-start gap-3 flex-1 overflow-hidden">
                                    <MessageSquare size={16} className={`mt-1 shrink-0 ${currentSessionId === chat.sessionId ? 'text-blue-400' : 'text-slate-500 group-hover:text-blue-400'}`} />
                                    <div className={`truncate text-sm ${currentSessionId === chat.sessionId ? 'text-blue-100 font-medium' : 'text-slate-300'}`}>
                                        {chat.message}
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm("Are you sure you want to delete this chat permanently?")) {
                                            deleteSession(chat.sessionId);
                                        }
                                    }}
                                    className="text-slate-500 hover:text-red-400 p-1 rounded-md hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                                    title="Delete chat"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-blue-400 border border-slate-700">
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-medium truncate">{user?.name}</div>
                        <div className="text-xs text-slate-500 truncate">{user?.email}</div>
                    </div>
                </div>

                <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded-lg transition-colors"
                >
                    <LogOut size={16} />
                    Sign Out
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
