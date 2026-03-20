import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Sidebar from '../components/Sidebar';
import { Send, User, BrainCircuit, Menu, Smile } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import EmojiPicker from 'emoji-picker-react';

const TypewriterMarkdown = ({ text, animate }) => {
    const [displayedText, setDisplayedText] = useState(animate ? '' : text);

    useEffect(() => {
        if (!animate) {
            setDisplayedText(text);
            return;
        }

        setDisplayedText('');
        let i = 0;
        const interval = setInterval(() => {
            setDisplayedText(text.slice(0, i + 1));
            i++;
            if (i >= text.length) clearInterval(interval);
        }, 12);

        return () => clearInterval(interval);
    }, [text, animate]);

    return (
        <ReactMarkdown
            components={{
                code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                        <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            className="rounded-md !my-2"
                            {...props}
                        >
                            {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                    ) : (
                        <code className="bg-slate-700 px-1.5 py-0.5 rounded text-blue-300 font-mono text-sm" {...props}>
                            {children}
                        </code>
                    )
                }
            }}
        >
            {displayedText}
        </ReactMarkdown>
    );
};

const Dashboard = () => {
    const { user, logout } = useAuth();
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [history, setHistory] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [currentSessionId, setCurrentSessionId] = useState(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const messagesEndRef = useRef(null);
    const emojiPickerRef = useRef(null);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
                setShowEmojiPicker(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const onEmojiClick = (emojiObject) => {
        setInput(prev => prev + emojiObject.emoji);
    };
    useEffect(() => {
        fetchHistory();
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    const fetchHistory = async () => {
        try {
            const response = await api.get('/chat/history');
            setHistory(response.data);
            if (response.data.length > 0 && !currentSessionId) {
                // Auto-load most recent session if none selected
                loadSession(response.data[0].sessionId);
            } else if (response.data.length === 0) {
                setMessages([]); // Start completely empty per requirements
            }
        } catch (error) {
            console.error("Failed to fetch history", error);
        }
    };

    const loadSession = async (sessionId) => {
        try {
            setCurrentSessionId(sessionId);
            setIsLoading(true);
            const response = await api.get(`/chat/session/${sessionId}`);
            const formatted = response.data.map(h => [
                { type: 'user', content: h.message, animate: false },
                { type: 'ai', content: h.response, animate: false }
            ]).flat();
            setMessages(formatted);
            if (window.innerWidth < 1024) setSidebarOpen(false);
        } catch (error) {
            console.error("Failed to load session context", error);
        } finally {
            setIsLoading(false);
        }
    };

    const startNewChat = () => {
        setCurrentSessionId(null);
        setMessages([]); // Start completely empty per requirements
        if (window.innerWidth < 1024) setSidebarOpen(false);
    };

    const deleteSession = async (sessionId) => {
        // Optimistic UI Update: Instantly remove from history array before backend completes
        setHistory(prevHistory => prevHistory.filter(session => session.sessionId !== sessionId));

        if (currentSessionId === sessionId) {
            startNewChat();
        }

        try {
            await api.delete(`/chat/session/${sessionId}`);
        } catch (error) {
            console.error("Failed to delete session", error);
            // Revert state silently if API fails
            fetchHistory();
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { type: 'user', content: userMsg, animate: false }]);
        setIsLoading(true);

        let activeSessionId = currentSessionId;
        if (!activeSessionId) {
            activeSessionId = crypto.randomUUID();
            setCurrentSessionId(activeSessionId);

            // Optimistic Title UI: Instantly add to sidebar with first 4-5 words
            const shortTitle = userMsg.split(' ').slice(0, 5).join(' ') + (userMsg.split(' ').length > 5 ? '...' : '');
            setHistory(prev => [{ sessionId: activeSessionId, message: shortTitle, createdAt: new Date().toISOString() }, ...prev]);
        }

        try {
            const response = await api.post('/chat', { message: userMsg, sessionId: activeSessionId });
            setMessages(prev => [...prev, { type: 'ai', content: response.data.response, animate: true }]);
            // Re-sync with actual backend titles silently
            fetchHistory();
        } catch (error) {
            const apiErrorMsg = error.response?.data?.message || 'An error occurred while connecting to the AI. Please try again later.';
            setMessages(prev => [...prev, { type: 'error', content: apiErrorMsg }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen overflow-hidden bg-slate-900">
            {/* Sidebar - Hidden on mobile by default */}
            <div className={`fixed z-20 inset-y-0 left-0 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 transition duration-200 ease-in-out`}>
                <Sidebar history={history} logout={logout} user={user} close={() => setSidebarOpen(false)} loadSession={loadSession} startNewChat={startNewChat} currentSessionId={currentSessionId} deleteSession={deleteSession} />
            </div>

            {/* Main chat area */}
            <div className="flex-1 flex flex-col h-full relative">
                {/* Mobile Header */}
                <div className="lg:hidden flex items-center justify-between bg-slate-800 p-4 border-b border-slate-700">
                    <div className="flex items-center gap-2 text-blue-400 font-bold">
                        <BrainCircuit size={24} />
                        Nexora
                    </div>
                    <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-slate-300">
                        <Menu size={24} />
                    </button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[85%] md:max-w-3xl flex gap-4 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                                {/* Avatar */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg ${msg.type === 'user' ? 'bg-blue-600' : msg.type === 'error' ? 'bg-red-500' : 'bg-indigo-600'}`}>
                                    {msg.type === 'user' ? <User size={20} className="text-white" /> : <BrainCircuit size={20} className="text-white" />}
                                </div>

                                {/* Message Bubble */}
                                <div className={`p-4 rounded-2xl shadow-md overflow-hidden ${msg.type === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-sm'
                                    : msg.type === 'error'
                                        ? 'bg-red-500/10 border border-red-500 text-red-400 rounded-tl-sm'
                                        : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm'
                                    }`}>
                                    {msg.type === 'user' ? (
                                        <p className="whitespace-pre-wrap leading-relaxed">
                                            {msg.content}
                                        </p>
                                    ) : (
                                        <div className="prose prose-invert max-w-none text-sm leading-relaxed prose-p:leading-relaxed prose-a:text-blue-400">
                                            <TypewriterMarkdown text={msg.content} animate={msg.animate} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-[85%] md:max-w-3xl flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center shrink-0 shadow-lg">
                                    <BrainCircuit size={20} className="text-white" />
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm flex items-center gap-2 shadow-md">
                                    <div className="typing-dot w-2 h-2 rounded-full bg-indigo-400"></div>
                                    <div className="typing-dot w-2 h-2 rounded-full bg-indigo-400"></div>
                                    <div className="typing-dot w-2 h-2 rounded-full bg-indigo-400"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-slate-900 border-t border-slate-800">
                    <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative group flex items-center gap-2">
                        <div className="relative flex-1" ref={emojiPickerRef}>
                            {showEmojiPicker && (
                                <div className="absolute bottom-full left-0 mb-2 z-50">
                                    <EmojiPicker theme="dark" onEmojiClick={onEmojiClick} />
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors z-10"
                            >
                                <Smile size={20} />
                            </button>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask Nexora anything..."
                                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl py-4 pl-12 pr-14 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-lg group-hover:border-slate-600"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={isLoading || !input.trim()}
                                className="absolute right-2 top-2 p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
                            >
                                <Send size={20} />
                            </button>
                        </div>
                    </form>
                    <p className="text-center text-xs text-slate-500 mt-3">Nexora AI is an intelligent assistant. Responses are generated based on context.</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
