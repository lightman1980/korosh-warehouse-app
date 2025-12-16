import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageCircle, Users, Send, Search, Plus, Archive, ArchiveRestore,
  Lock, Paperclip, Download, File, Image, X, Eye, Trash2, Phone,
  Video, Mic, Smile, MoreVertical, Pin, Star, Edit, Reply, Forward,
  Check, CheckCheck, Clock, MapPin, User, Hash, Bell, BellOff, Shield,
  UserPlus, UserMinus, Settings, Moon, Sun, ThumbsUp, Heart, Laugh,
  Frown, Angry, Printer, Save, Folder, Sticker, Film, Music, FileText,
  UserCheck, ShieldAlert, Volume2, VolumeX, Calendar, Tag, Camera
} from 'lucide-react';
import { formatPersianDate, formatPersianDateTime } from '../../utils/persian';
import { DataStorage } from '../../utils/dataStorage';

// Interfaces
interface Message {
  id: string;
  senderId: string;
  senderName: string;
  receiverId?: string;
  receiverName?: string;
  groupId?: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  isDelivered: boolean;
  attachments?: FileAttachment[];
  isPrivate: boolean;
  isEdited?: boolean;
  editedAt?: Date;
  isPinned?: boolean;
  isStarred?: boolean;
  replyTo?: string;
  reactions?: MessageReaction[];
  scheduledFor?: Date;
  autoDeleteAt?: Date;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  isForwarded?: boolean;
  originalSenderId?: string;
  originalSenderName?: string;
  originalTimestamp?: Date;
  pollId?: string;
  sticker?: string;
  seenBy: string[];
}

interface MessageReaction {
  emoji: string;
  userId: string;
  timestamp: Date;
}

interface FileAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: Date;
  url: string;
  data?: string;
  duration?: number;
  thumbnail?: string;
}

interface Group {
  id: string;
  name: string;
  description: string;
  members: string[];
  admins: string[];
  createdBy: string;
  createdAt: Date;
  isArchived: boolean;
  pinnedMessages?: string[];
  permissions: {
    canMembersAddOthers: boolean;
    canMembersSendMessages: boolean;
    canMembersEditInfo: boolean;
    canMembersPinMessages: boolean;
  };
  settings: {
    onlyAdminsCanEdit: boolean;
    onlyAdminsCanPin: boolean;
    showJoinLeaveMessages: boolean;
    enableAntiSpam: boolean;
    maxFileSize: number;
  };
}

interface Conversation {
  id: string;
  type: 'private' | 'group' | 'broadcast';
  name: string;
  participants: string[];
  lastMessage?: Message;
  unreadCount: number;
  isArchived: boolean;
  isMuted: boolean;
  isPinned: boolean;
  lastSeen?: Date;
  onlineStatus?: 'online' | 'offline' | 'away';
  tags?: string[];
}

interface UserStatus {
  userId: string;
  status: 'online' | 'offline' | 'away';
  lastSeen?: Date;
}

interface Poll {
  id: string;
  question: string;
  options: {
    id: string;
    text: string;
    votes: number;
    voters: string[];
  }[];
  createdBy: string;
  createdAt: Date;
  isAnonymous: boolean;
  allowsMultipleAnswers: boolean;
}

interface StickerPack {
  id: string;
  name: string;
  stickers: {
    id: string;
    emoji: string;
    url: string;
  }[];
}

interface BroadcastListSettings {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdBy: string;
  createdAt: Date;
  allowReplies: boolean;
  showDeliveryStatus: boolean;
  maxMessageSize: number;
}

export const MessagingManager: React.FC = () => {
  const storage = DataStorage.getInstance();
  
  // State declarations
  const [users, setUsers] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showGroupSettingsModal, setShowGroupSettingsModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedPrivateUser, setSelectedPrivateUser] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [showPrivateConversations, setShowPrivateConversations] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [userStatuses, setUserStatuses] = useState<UserStatus[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [forwardingMessage, setForwardingMessage] = useState<string | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState<string | null>(null);
  const [scheduledMessages, setScheduledMessages] = useState<Message[]>([]);
  const [starredMessages, setStarredMessages] = useState<Message[]>([]);
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [messageSearchTerm, setMessageSearchTerm] = useState('');
  const [showMessageSearch, setShowMessageSearch] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [typingStatus, setTypingStatus] = useState<{userId: string, userName: string, timestamp: Date}[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{latitude: number, longitude: number, address?: string} | null>(null);
  const [autoDeleteTime, setAutoDeleteTime] = useState<number | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [printContent, setPrintContent] = useState<string>('');
  const [archiveSearchTerm, setArchiveSearchTerm] = useState('');
  const [archiveFilter, setArchiveFilter] = useState<'all' | 'groups' | 'private'>('all');
  const [conversationTags, setConversationTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showTagManager, setShowTagManager] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');
  const [stickerPacks, setStickerPacks] = useState<StickerPack[]>([]);
  const [selectedStickerPack, setSelectedStickerPack] = useState<StickerPack | null>(null);
  const [broadcastLists, setBroadcastLists] = useState<BroadcastListSettings[]>([]);
  const [showBroadcastSettingsModal, setShowBroadcastSettingsModal] = useState(false);
  const [selectedBroadcastList, setSelectedBroadcastList] = useState<BroadcastListSettings | null>(null);
  const [showUserEditModal, setShowUserEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Initialize sticker packs
  useEffect(() => {
    const defaultPacks: StickerPack[] = [
      {
        id: 'pack1',
        name: 'احساسات',
        stickers: [
          { id: 's1', emoji: '😀', url: '' },
          { id: 's2', emoji: '😂', url: '' },
          { id: 's3', emoji: '😍', url: '' },
          { id: 's4', emoji: '😎', url: '' },
          { id: 's5', emoji: '😢', url: '' },
          { id: 's6', emoji: '😡', url: '' },
        ]
      },
      {
        id: 'pack2',
        name: 'کارت‌ها',
        stickers: [
          { id: 'c1', emoji: '👍', url: '' },
          { id: 'c2', emoji: '👎', url: '' },
          { id: 'c3', emoji: '👏', url: '' },
          { id: 'c4', emoji: '🙏', url: '' },
          { id: 'c5', emoji: '💯', url: '' },
          { id: 'c6', emoji: '🔥', url: '' },
        ]
      }
    ];
    
    setStickerPacks(defaultPacks);
    if (defaultPacks.length > 0) {
      setSelectedStickerPack(defaultPacks[0]);
    }
  }, []);
  
  // Effects
  useEffect(() => {
    const loadData = () => {
      try {
        const savedUsers = storage.loadData('users') || [];
        const savedMessages = storage.loadData('messages') || [];
        const savedGroups = storage.loadData('groups') || [];
        const savedConversations = storage.loadData('conversations') || [];
        const savedStatuses = storage.loadData('userStatuses') || [];
        const savedScheduledMessages = storage.loadData('scheduledMessages') || [];
        const savedStarredMessages = storage.loadData('starredMessages') || [];
        const savedPolls = storage.loadData('polls') || [];
        const savedDarkMode = storage.loadData('darkMode') || false;
        const savedTags = storage.loadData('conversationTags') || [];
        const savedBroadcastLists = storage.loadData('broadcastLists') || [];
        
        setUsers(savedUsers.filter((u: any) => u.isActive));
        setMessages(savedMessages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
          editedAt: m.editedAt ? new Date(m.editedAt) : undefined,
          scheduledFor: m.scheduledFor ? new Date(m.scheduledFor) : undefined,
          autoDeleteAt: m.autoDeleteAt ? new Date(m.autoDeleteAt) : undefined,
          seenBy: m.seenBy || []
        })));
        setGroups(savedGroups.map((g: any) => ({
          ...g,
          createdAt: new Date(g.createdAt),
          settings: g.settings || {
            onlyAdminsCanEdit: false,
            onlyAdminsCanPin: false,
            showJoinLeaveMessages: true,
            enableAntiSpam: true,
            maxFileSize: 100
          }
        })));
        setConversations(savedConversations);
        setUserStatuses(savedStatuses);
        setScheduledMessages(savedScheduledMessages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
          scheduledFor: new Date(m.scheduledFor),
          seenBy: m.seenBy || []
        })));
        setStarredMessages(savedStarredMessages.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp),
          editedAt: m.editedAt ? new Date(m.editedAt) : undefined,
          seenBy: m.seenBy || []
        })));
        setPolls(savedPolls.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt)
        })));
        setDarkMode(savedDarkMode);
        setConversationTags(savedTags);
        setBroadcastLists(savedBroadcastLists.map((bl: any) => ({
          ...bl,
          createdAt: new Date(bl.createdAt)
        })));
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };
    
    loadData();
    
    // Set up listeners
    const listeners = ['users', 'messages', 'groups', 'conversations', 'userStatuses', 
                      'scheduledMessages', 'starredMessages', 'polls', 'darkMode', 'conversationTags', 'broadcastLists'];
    listeners.forEach(key => {
      storage.addListener(key, loadData);
    });
    
    // Set up typing indicator simulation
    const typingInterval = setInterval(() => {
      if (activeConversation && Math.random() > 0.8) {
        const conversation = conversations.find(c => c.id === activeConversation);
        if (conversation && conversation.type === 'group') {
          const otherUsers = conversation.participants.filter(id => id !== (users.find(u => u.username === 'admin')?.id));
          if (otherUsers.length > 0) {
            const randomUser = otherUsers[Math.floor(Math.random() * otherUsers.length)];
            const user = users.find(u => u.id === randomUser);
            if (user) {
              setTypingStatus(prev => [
                ...prev.filter(t => t.userId !== randomUser),
                { userId: randomUser, userName: user.fullName, timestamp: new Date() }
              ]);
              
              setTimeout(() => {
                setTypingStatus(prev => prev.filter(t => t.userId !== randomUser));
              }, 3000);
            }
          }
        }
      }
    }, 10000);
    
    // Set up online status simulation
    const statusInterval = setInterval(() => {
      if (users.length > 0) {
        const randomUser = users[Math.floor(Math.random() * users.length)];
        const statuses: ('online' | 'offline' | 'away')[] = ['online', 'offline', 'away'];
        const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
        
        setUserStatuses(prev => {
          const existingStatusIndex = prev.findIndex(s => s.userId === randomUser.id);
          
          if (existingStatusIndex >= 0) {
            const updatedStatuses = [...prev];
            updatedStatuses[existingStatusIndex] = {
              ...updatedStatuses[existingStatusIndex],
              status: randomStatus,
              lastSeen: randomStatus === 'offline' ? new Date() : undefined
            };
            return updatedStatuses;
          } else {
            return [
              ...prev,
              {
                userId: randomUser.id,
                status: randomStatus,
                lastSeen: randomStatus === 'offline' ? new Date() : undefined
              }
            ];
          }
        });
      }
    }, 30000);
    
    // Check for scheduled messages to send
    const scheduledCheck = setInterval(() => {
      const now = new Date();
      const messagesToSend = scheduledMessages.filter(m => 
        m.scheduledFor && new Date(m.scheduledFor) <= now
      );
      
      if (messagesToSend.length > 0) {
        setMessages(prev => [...prev, ...messagesToSend]);
        setScheduledMessages(prev => prev.filter(m => 
          !messagesToSend.some(toSend => toSend.id === m.id)
        ));
      }
      
      // Check for auto-delete messages
      const messagesToDelete = messages.filter(m => 
        m.autoDeleteAt && new Date(m.autoDeleteAt) <= now
      );
      
      if (messagesToDelete.length > 0) {
        setMessages(prev => prev.filter(m => 
          !messagesToDelete.some(toDelete => toDelete.id === m.id)
        ));
      }
    }, 60000);
    
    // Mark messages as seen
    const seenCheck = setInterval(() => {
      if (activeConversation && messages.length > 0) {
        const currentUser = users.find(u => u.username === 'admin') || users[0];
        if (!currentUser) return;
        
        const conversation = conversations.find(c => c.id === activeConversation);
        if (conversation) {
          const unseenMessages = messages.filter(m => {
            if (conversation.type === 'group' && m.groupId === activeConversation) {
              return !m.seenBy.includes(currentUser.id) && m.senderId !== currentUser.id;
            }
            
            if (conversation.type === 'private' && 
                ((m.senderId && conversation.participants.includes(m.senderId)) &&
                 (m.receiverId && conversation.participants.includes(m.receiverId)))) {
              return !m.seenBy.includes(currentUser.id) && m.senderId !== currentUser.id;
            }
            
            // Fixed broadcast message handling
            if (conversation.type === 'broadcast' && 
                m.senderId === conversation.participants[0] && 
                m.receiverId && conversation.participants.includes(m.receiverId)) {
              return !m.seenBy.includes(currentUser.id) && m.senderId !== currentUser.id;
            }
            
            return false;
          });
          
          unseenMessages.forEach(message => {
            setMessages(prev => prev.map(msg => 
              msg.id === message.id 
                ? { ...msg, seenBy: [...msg.seenBy, currentUser.id] } 
                : msg
            ));
          });
        }
      }
    }, 1000);
    
    return () => {
      listeners.forEach(key => {
        storage.removeListener(key, loadData);
      });
      clearInterval(typingInterval);
      clearInterval(statusInterval);
      clearInterval(scheduledCheck);
      clearInterval(seenCheck);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, [activeConversation, conversations, users]);
  
  // Save data when changed
  useEffect(() => {
    try {
      if (messages.length > 0) storage.saveData('messages', messages);
    } catch (error) {
      console.error('Error saving messages:', error);
    }
  }, [messages]);
  
  useEffect(() => {
    try {
      if (groups.length > 0) storage.saveData('groups', groups);
    } catch (error) {
      console.error('Error saving groups:', error);
    }
  }, [groups]);
  
  useEffect(() => {
    try {
      if (conversations.length > 0) storage.saveData('conversations', conversations);
    } catch (error) {
      console.error('Error saving conversations:', error);
    }
  }, [conversations]);
  
  useEffect(() => {
    try {
      storage.saveData('userStatuses', userStatuses);
    } catch (error) {
      console.error('Error saving user statuses:', error);
    }
  }, [userStatuses]);
  
  useEffect(() => {
    try {
      storage.saveData('scheduledMessages', scheduledMessages);
    } catch (error) {
      console.error('Error saving scheduled messages:', error);
    }
  }, [scheduledMessages]);
  
  useEffect(() => {
    try {
      storage.saveData('starredMessages', starredMessages);
    } catch (error) {
      console.error('Error saving starred messages:', error);
    }
  }, [starredMessages]);
  
  useEffect(() => {
    try {
      storage.saveData('polls', polls);
    } catch (error) {
      console.error('Error saving polls:', error);
    }
  }, [polls]);
  
  useEffect(() => {
    try {
      storage.saveData('darkMode', darkMode);
    } catch (error) {
      console.error('Error saving dark mode:', error);
    }
  }, [darkMode]);
  
  useEffect(() => {
    try {
      storage.saveData('conversationTags', conversationTags);
    } catch (error) {
      console.error('Error saving conversation tags:', error);
    }
  }, [conversationTags]);
  
  useEffect(() => {
    try {
      if (broadcastLists.length > 0) storage.saveData('broadcastLists', broadcastLists);
    } catch (error) {
      console.error('Error saving broadcast lists:', error);
    }
  }, [broadcastLists]);
  
  // Scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Camera functions
  useEffect(() => {
    if (showCamera) {
      startCamera();
    } else {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [showCamera]);
  
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("دوربین در دسترس نیست");
      setShowCamera(false);
    }
  };
  
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };
  
  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        
        const imageDataUrl = canvasRef.current.toDataURL('image/png');
        setCapturedImage(imageDataUrl);
        setShowCamera(false);
        
        // Add as attachment
        const attachment: FileAttachment = {
          id: `image_${Date.now()}`,
          fileName: `عکس_${formatPersianDateTime(new Date())}.png`,
          fileType: 'image/png',
          fileSize: 0, // In a real app, calculate actual size
          uploadDate: new Date(),
          url: imageDataUrl,
          data: imageDataUrl
        };
        
        setAttachments(prev => [...prev, attachment]);
      }
    }
  };
  
  // File handling
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, fileType?: string) => {
    const files = event.target.files;
    if (!files) return;
    
    Array.from(files).forEach(file => {
      // Check file size limit for groups
      if (activeConversationData?.type === 'group') {
        const group = groups.find(g => g.id === activeConversation);
        if (group && file.size > group.settings.maxFileSize * 1024 * 1024) {
          alert(`حجم فایل نباید بیشتر از ${group.settings.maxFileSize} مگابایت باشد`);
          return;
        }
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        const attachment: FileAttachment = {
          id: `file_${Date.now()}_${Math.random()}`,
          fileName: file.name,
          fileType: fileType || file.type,
          fileSize: file.size,
          uploadDate: new Date(),
          url: URL.createObjectURL(file),
          data: e.target?.result as string
        };
        
        if (file.type.startsWith('audio/')) {
          attachment.duration = Math.floor(Math.random() * 300) + 30;
        }
        
        if (file.type.startsWith('video/')) {
          // Generate thumbnail for video
          attachment.thumbnail = ''; // In a real app, this would be a real thumbnail
        }
        
        setAttachments(prev => [...prev, attachment]);
      };
      reader.readAsDataURL(file);
    });
  };
  
  const downloadFile = (attachment: FileAttachment) => {
    try {
      if (attachment.data) {
        // For large files, use a different method
        if (attachment.fileSize > 10 * 1024 * 1024) { // If file is larger than 10MB
          const blob = new Blob([attachment.data], { type: attachment.fileType });
          const url = URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = url;
          link.download = attachment.fileName;
          document.body.appendChild(link);
          link.click();
          
          // Clean up memory after download
          setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
          }, 100);
        } else {
          // For smaller files
          const link = document.createElement('a');
          link.href = attachment.data;
          link.download = attachment.fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else if (attachment.url) {
        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
      alert('خطا در دانلود فایل. لطفا فضای ذخیره‌سازی خود را بررسی کنید.');
    }
  };
  
  const removeAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(a => a.id !== attachmentId));
  };
  
  // Voice recording
  const startRecording = () => {
    setIsRecording(true);
    setRecordingTime(0);
    
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
  };
  
  const stopRecording = () => {
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }
    
    setIsRecording(false);
    
    const voiceAttachment: FileAttachment = {
      id: `voice_${Date.now()}`,
      fileName: `پیام صوتی ${formatPersianDateTime(new Date())}.ogg`,
      fileType: 'audio/ogg',
      fileSize: recordingTime * 5000,
      uploadDate: new Date(),
      url: '',
      duration: recordingTime
    };
    
    setAttachments([voiceAttachment]);
    setRecordingTime(0);
  };
  
  // Message functions
  const sendMessage = () => {
    if (!newMessage.trim() && attachments.length === 0 && !selectedLocation && !selectedSticker) return;
    if (!activeConversation) return;
    
    const currentUser = users.find(u => u.username === 'admin') || users[0];
    if (!currentUser) return;
    
    const conversation = conversations.find(c => c.id === activeConversation);
    if (!conversation) return;
    
    // Handle broadcast messages differently
    if (conversation.type === 'broadcast') {
      const broadcastList = broadcastLists.find(bl => bl.id === activeConversation);
      if (!broadcastList) return;
      
      // Create a separate message for each recipient
      const newMessages: Message[] = [];
      
      broadcastList.members.forEach(memberId => {
        if (memberId === currentUser.id) return; // Skip sender
        
        const member = users.find(u => u.id === memberId);
        if (!member) return;
        
        const message: Message = {
          id: `msg_${Date.now()}_${memberId}`,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          receiverId: memberId,
          receiverName: member.fullName,
          content: newMessage,
          timestamp: new Date(),
          isRead: false,
          isDelivered: false,
          attachments: attachments.length > 0 ? [...attachments] : undefined,
          isPrivate: false,
          replyTo: replyingTo || undefined,
          location: selectedLocation || undefined,
          sticker: selectedSticker || undefined,
          seenBy: []
        };
        
        if (autoDeleteTime) {
          const deleteDate = new Date();
          deleteDate.setHours(deleteDate.getHours() + autoDeleteTime);
          message.autoDeleteAt = deleteDate;
        }
        
        newMessages.push(message);
      });
      
      // Add all messages to the state
      setMessages(prev => [...prev, ...newMessages]);
      
      // Update conversation with last message
      if (newMessages.length > 0) {
        setConversations(prev => prev.map(conv => 
          conv.id === activeConversation 
            ? { ...conv, lastMessage: newMessages[0], unreadCount: conv.unreadCount + 1 }
            : conv
        ));
      }
    } else {
      // Regular group or private message
      const message: Message = {
        id: `msg_${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        content: newMessage,
        timestamp: new Date(),
        isRead: false,
        isDelivered: false,
        attachments: attachments.length > 0 ? [...attachments] : undefined,
        isPrivate: activeConversation.startsWith('private_'),
        replyTo: replyingTo || undefined,
        location: selectedLocation || undefined,
        sticker: selectedSticker || undefined,
        seenBy: []
      };
      
      if (autoDeleteTime) {
        const deleteDate = new Date();
        deleteDate.setHours(deleteDate.getHours() + autoDeleteTime);
        message.autoDeleteAt = deleteDate;
      }
      
      if (conversation.type === 'private') {
        const otherUserId = conversation.participants.find(p => p !== currentUser.id);
        const otherUser = users.find(u => u.id === otherUserId);
        if (otherUser) {
          message.receiverId = otherUser.id;
          message.receiverName = otherUser.fullName;
        }
      } else if (conversation.type === 'group') {
        message.groupId = activeConversation;
      }
      
      setMessages(prev => [...prev, message]);
      setConversations(prev => prev.map(conv => 
        conv.id === activeConversation 
          ? { ...conv, lastMessage: message, unreadCount: conv.unreadCount + 1 }
          : conv
      ));
      
      setTimeout(() => {
        setMessages(prev => prev.map(m => 
          m.id === message.id ? { ...m, isDelivered: true } : m
        ));
      }, 1000);
    }
    
    setNewMessage('');
    setAttachments([]);
    setReplyingTo(null);
    setSelectedLocation(null);
    setSelectedSticker(null);
    setAutoDeleteTime(null);
  };
  
  const scheduleMessage = () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!activeConversation) return;
    
    const currentUser = users.find(u => u.username === 'admin') || users[0];
    if (!currentUser) return;
    
    const scheduledDate = new Date();
    scheduledDate.setHours(scheduledDate.getHours() + 1);
    
    const message: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.fullName,
      content: newMessage,
      timestamp: new Date(),
      isRead: false,
      isDelivered: false,
      attachments: attachments.length > 0 ? [...attachments] : undefined,
      isPrivate: activeConversation.startsWith('private_'),
      scheduledFor: scheduledDate,
      seenBy: []
    };
    
    const conversation = conversations.find(c => c.id === activeConversation);
    if (conversation?.type === 'private') {
      const otherUserId = conversation.participants.find(p => p !== currentUser.id);
      const otherUser = users.find(u => u.id === otherUserId);
      if (otherUser) {
        message.receiverId = otherUser.id;
        message.receiverName = otherUser.fullName;
      }
    } else if (conversation?.type === 'group') {
      message.groupId = activeConversation;
    }
    
    setScheduledMessages(prev => [...prev, message]);
    setNewMessage('');
    setAttachments([]);
    
    alert(`پیام برای ${formatPersianDateTime(scheduledDate)} برنامه ریزی شد`);
  };
  
  const editMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    setNewMessage(message.content);
    setEditingMessage(messageId);
    setShowMessageOptions(null);
  };
  
  const saveEditedMessage = () => {
    if (!editingMessage || !newMessage.trim()) return;
    
    setMessages(prev => prev.map(m => 
      m.id === editingMessage 
        ? { 
            ...m, 
            content: newMessage, 
            isEdited: true, 
            editedAt: new Date() 
          } 
        : m
    ));
    
    setNewMessage('');
    setEditingMessage(null);
  };
  
  const deleteMessage = (messageId: string, forEveryone: boolean = false) => {
    if (forEveryone) {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } else {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    }
    
    setShowMessageOptions(null);
  };
  
  const deleteConversation = (conversationId: string) => {
    if (confirm('آیا از حذف این گفتگو اطمینان دارید؟')) {
      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
      
      // Also delete related messages
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        if (conversation.type === 'group') {
          setMessages(prev => prev.filter(m => m.groupId !== conversationId));
        } else if (conversation.type === 'private') {
          setMessages(prev => prev.filter(m => 
            !(m.senderId && conversation.participants.includes(m.senderId)) ||
            !(m.receiverId && conversation.participants.includes(m.receiverId))
          ));
        } else if (conversation.type === 'broadcast') {
          // For broadcast, remove all messages where sender is the creator
          const broadcastList = broadcastLists.find(bl => bl.id === conversationId);
          if (broadcastList) {
            setMessages(prev => prev.filter(m => 
              !(m.senderId === broadcastList.createdBy && 
                m.receiverId && broadcastList.members.includes(m.receiverId))
            ));
          }
        }
      }
      
      if (activeConversation === conversationId) {
        setActiveConversation(null);
      }
    }
  };
  
  const toggleStarMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    if (message.isStarred) {
      setStarredMessages(prev => prev.filter(m => m.id !== messageId));
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isStarred: false } : m
      ));
    } else {
      setStarredMessages(prev => [...prev, message]);
      setMessages(prev => prev.map(m => 
        m.id === messageId ? { ...m, isStarred: true } : m
      ));
    }
    
    setShowMessageOptions(null);
  };
  
  const togglePinMessage = (messageId: string) => {
    const message = messages.find(m => m.id === messageId);
    if (!message) return;
    
    setMessages(prev => prev.map(m => 
      m.id === messageId ? { ...m, isPinned: !m.isPinned } : m
    ));
    
    if (message.groupId) {
      setGroups(prev => prev.map(group => {
        if (group.id === message.groupId) {
          const pinnedMessages = group.pinnedMessages || [];
          if (message.isPinned) {
            return {
              ...group,
              pinnedMessages: pinnedMessages.filter(id => id !== messageId)
            };
          } else {
            return {
              ...group,
              pinnedMessages: [...pinnedMessages, messageId]
            };
          }
        }
        return group;
      }));
    }
    
    setShowMessageOptions(null);
  };
  
  const forwardMessage = (messageId: string) => {
    setForwardingMessage(messageId);
    setShowMessageOptions(null);
  };
  
  const completeForward = (conversationId: string) => {
    if (!forwardingMessage) return;
    
    const originalMessage = messages.find(m => m.id === forwardingMessage);
    if (!originalMessage) return;
    
    const currentUser = users.find(u => u.username === 'admin') || users[0];
    if (!currentUser) return;
    
    const conversation = conversations.find(c => c.id === conversationId);
    if (!conversation) return;
    
    // Handle broadcast forwarding differently
    if (conversation.type === 'broadcast') {
      const broadcastList = broadcastLists.find(bl => bl.id === conversationId);
      if (!broadcastList) return;
      
      // Create a separate message for each recipient
      const newMessages: Message[] = [];
      
      broadcastList.members.forEach(memberId => {
        if (memberId === currentUser.id) return; // Skip sender
        
        const member = users.find(u => u.id === memberId);
        if (!member) return;
        
        const forwardedMessage: Message = {
          ...originalMessage,
          id: `msg_${Date.now()}_${memberId}`,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          receiverId: memberId,
          receiverName: member.fullName,
          timestamp: new Date(),
          isRead: false,
          isDelivered: false,
          isForwarded: true,
          originalSenderId: originalMessage.senderId,
          originalSenderName: originalMessage.senderName,
          originalTimestamp: originalMessage.timestamp,
          seenBy: []
        };
        
        newMessages.push(forwardedMessage);
      });
      
      // Add all messages to the state
      setMessages(prev => [...prev, ...newMessages]);
      
      // Update conversation with last message
      if (newMessages.length > 0) {
        setConversations(prev => prev.map(conv => 
          conv.id === conversationId 
            ? { ...conv, lastMessage: newMessages[0], unreadCount: conv.unreadCount + 1 }
            : conv
        ));
      }
    } else {
      // Regular group or private message
      const forwardedMessage: Message = {
        ...originalMessage,
        id: `msg_${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        timestamp: new Date(),
        isRead: false,
        isDelivered: false,
        isForwarded: true,
        originalSenderId: originalMessage.senderId,
        originalSenderName: originalMessage.senderName,
        originalTimestamp: originalMessage.timestamp,
        seenBy: []
      };
      
      if (conversation.type === 'private') {
        const otherUserId = conversation.participants.find(p => p !== currentUser.id);
        const otherUser = users.find(u => u.id === otherUserId);
        if (otherUser) {
          forwardedMessage.receiverId = otherUser.id;
          forwardedMessage.receiverName = otherUser.fullName;
        }
      } else if (conversation.type === 'group') {
        forwardedMessage.groupId = conversationId;
      }
      
      setMessages(prev => [...prev, forwardedMessage]);
      
      setConversations(prev => prev.map(conv => 
        conv.id === conversationId 
          ? { ...conv, lastMessage: forwardedMessage, unreadCount: conv.unreadCount + 1 }
          : conv
      ));
    }
    
    setForwardingMessage(null);
  };
  
  const addReaction = (messageId: string, emoji: string) => {
    const currentUser = users.find(u => u.username === 'admin') || users[0];
    if (!currentUser) return;
    
    setMessages(prev => prev.map(m => {
      if (m.id === messageId) {
        const reactions = m.reactions || [];
        const existingReactionIndex = reactions.findIndex(r => r.userId === currentUser.id);
        
        if (existingReactionIndex >= 0) {
          const updatedReactions = [...reactions];
          updatedReactions[existingReactionIndex] = {
            emoji,
            userId: currentUser.id,
            timestamp: new Date()
          };
          return { ...m, reactions: updatedReactions };
        } else {
          return {
            ...m,
            reactions: [
              ...reactions,
              {
                emoji,
                userId: currentUser.id,
                timestamp: new Date()
              }
            ]
          };
        }
      }
      return m;
    }));
    
    setShowMessageOptions(null);
  };
  
  // Print and save functions
  const preparePrintContent = () => {
    if (!activeConversation) return;
    
    const conversation = conversations.find(c => c.id === activeConversation);
    if (!conversation) return;
    
    let convMessages: Message[] = [];
    
    if (conversation.type === 'broadcast') {
      // For broadcast, get all messages sent by the creator to any member
      const broadcastList = broadcastLists.find(bl => bl.id === activeConversation);
      if (broadcastList) {
        convMessages = messages.filter(m => 
          m.senderId === broadcastList.createdBy && 
          m.receiverId && 
          broadcastList.members.includes(m.receiverId)
        );
      }
    } else {
      convMessages = messages.filter(m => {
        if (conversation.type === 'group' && m.groupId === activeConversation) {
          return true;
        }
        
        if (conversation.type === 'private' && 
            ((m.senderId && conversation.participants.includes(m.senderId)) &&
             (m.receiverId && conversation.participants.includes(m.receiverId)))) {
          return true;
        }
        
        return false;
      });
    }
    
    let content = `
      <div dir="rtl" style="font-family: 'Vazir', sans-serif; padding: 20px;">
        <h1 style="text-align: center; margin-bottom: 20px;">گفتگو با ${conversation.name}</h1>
        <div style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">
          <strong>تاریخ چاپ:</strong> ${formatPersianDateTime(new Date())}<br>
          <strong>تعداد پیام‌ها:</strong> ${convMessages.length}
        </div>
        <div>
    `;
    
    convMessages.forEach(message => {
      const sender = users.find(u => u.id === message.senderId);
      const isCurrentUser = message.senderId === (users.find(u => u.username === 'admin') || users[0])?.id;
      
      content += `
        <div style="margin-bottom: 15px; ${isCurrentUser ? 'text-align: left;' : 'text-align: right;'}">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">
            ${sender?.fullName || 'کاربر ناشناس'} - ${formatPersianDateTime(message.timestamp)}
          </div>
          <div style="
            display: inline-block;
            padding: 10px 15px;
            border-radius: 10px;
            max-width: 70%;
            ${isCurrentUser 
              ? 'background-color: #007bff; color: white;' 
              : 'background-color: #f1f1f1; color: #333;'}
          ">
            ${message.content}
          </div>
        </div>
      `;
    });
    
    content += `
        </div>
      </div>
    `;
    
    setPrintContent(content);
    setShowPrintModal(true);
  };
  
  const printConversation = () => {
    if (!printContent) return;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    
    setShowPrintModal(false);
  };
  
  const saveConversation = () => {
    if (!activeConversation) return;
    
    const conversation = conversations.find(c => c.id === activeConversation);
    if (!conversation) return;
    
    let convMessages: Message[] = [];
    
    if (conversation.type === 'broadcast') {
      // For broadcast, get all messages sent by the creator to any member
      const broadcastList = broadcastLists.find(bl => bl.id === activeConversation);
      if (broadcastList) {
        convMessages = messages.filter(m => 
          m.senderId === broadcastList.createdBy && 
          m.receiverId && 
          broadcastList.members.includes(m.receiverId)
        );
      }
    } else {
      convMessages = messages.filter(m => {
        if (conversation.type === 'group' && m.groupId === activeConversation) {
          return true;
        }
        
        if (conversation.type === 'private' && 
            ((m.senderId && conversation.participants.includes(m.senderId)) &&
             (m.receiverId && conversation.participants.includes(m.receiverId)))) {
          return true;
        }
        
        return false;
      });
    }
    
    let content = `گفتگو با ${conversation.name}\n`;
    content += `تاریخ ذخیره: ${formatPersianDateTime(new Date())}\n`;
    content += `تعداد پیام‌ها: ${convMessages.length}\n\n`;
    
    convMessages.forEach(message => {
      const sender = users.find(u => u.id === message.senderId);
      content += `${sender?.fullName || 'کاربر ناشناس'} - ${formatPersianDateTime(message.timestamp)}:\n`;
      content += `${message.content}\n\n`;
    });
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `گفتگو_${conversation.name}_${formatPersianDate(new Date())}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  // Poll functions
  const createPoll = () => {
    if (!activePoll || !activePoll.question.trim() || activePoll.options.length < 2) return;
    
    const newPoll: Poll = {
      ...activePoll,
      id: `poll_${Date.now()}`,
      createdAt: new Date()
    };
    
    setPolls(prev => [...prev, newPoll]);
    
    const currentUser = users.find(u => u.username === 'admin') || users[0];
    if (!currentUser) return;
    
    const conversation = conversations.find(c => c.id === activeConversation);
    if (!conversation) return;
    
    // Handle broadcast polls differently
    if (conversation.type === 'broadcast') {
      const broadcastList = broadcastLists.find(bl => bl.id === activeConversation);
      if (!broadcastList) return;
      
      // Create a separate poll message for each recipient
      const newMessages: Message[] = [];
      
      broadcastList.members.forEach(memberId => {
        if (memberId === currentUser.id) return; // Skip sender
        
        const member = users.find(u => u.id === memberId);
        if (!member) return;
        
        const pollMessage: Message = {
          id: `msg_${Date.now()}_${memberId}`,
          senderId: currentUser.id,
          senderName: currentUser.fullName,
          receiverId: memberId,
          receiverName: member.fullName,
          content: `نظرسنجی: ${newPoll.question}`,
          timestamp: new Date(),
          isRead: false,
          isDelivered: false,
          isPrivate: false,
          pollId: newPoll.id,
          seenBy: []
        };
        
        newMessages.push(pollMessage);
      });
      
      // Add all messages to the state
      setMessages(prev => [...prev, ...newMessages]);
      
      // Update conversation with last message
      if (newMessages.length > 0) {
        setConversations(prev => prev.map(conv => 
          conv.id === activeConversation 
            ? { ...conv, lastMessage: newMessages[0], unreadCount: conv.unreadCount + 1 }
            : conv
        ));
      }
    } else {
      // Regular group or private poll
      const pollMessage: Message = {
        id: `msg_${Date.now()}`,
        senderId: currentUser.id,
        senderName: currentUser.fullName,
        content: `نظرسنجی: ${newPoll.question}`,
        timestamp: new Date(),
        isRead: false,
        isDelivered: false,
        isPrivate: activeConversation?.startsWith('private_') || false,
        pollId: newPoll.id,
        seenBy: []
      };
      
      if (conversation.type === 'private') {
        const otherUserId = conversation.participants.find(p => p !== currentUser.id);
        const otherUser = users.find(u => u.id === otherUserId);
        if (otherUser) {
          pollMessage.receiverId = otherUser.id;
          pollMessage.receiverName = otherUser.fullName;
        }
      } else if (conversation.type === 'group') {
        pollMessage.groupId = activeConversation;
      }
      
      setMessages(prev => [...prev, pollMessage]);
      
      setConversations(prev => prev.map(conv => 
        conv.id === activeConversation 
          ? { ...conv, lastMessage: pollMessage, unreadCount: conv.unreadCount + 1 }
          : conv
      ));
    }
    
    setActivePoll(null);
  };
  
  const voteInPoll = (pollId: string, optionId: string) => {
    const currentUser = users.find(u => u.username === 'admin') || users[0];
    if (!currentUser) return;
    
    setPolls(prev => prev.map(poll => {
      if (poll.id === pollId) {
        const updatedOptions = poll.options.map(option => {
          if (option.id === optionId) {
            if (!poll.allowsMultipleAnswers && option.voters.includes(currentUser.id)) {
              return {
                ...option,
                votes: option.votes - 1,
                voters: option.voters.filter(id => id !== currentUser.id)
              };
            } else if (!poll.allowsMultipleAnswers) {
              poll.options.forEach(opt => {
                if (opt.id !== optionId && opt.voters.includes(currentUser.id)) {
                  opt.votes -= 1;
                  opt.voters = opt.voters.filter(id => id !== currentUser.id);
                }
              });
              
              return {
                ...option,
                votes: option.votes + 1,
                voters: [...option.voters, currentUser.id]
              };
            } else {
              if (option.voters.includes(currentUser.id)) {
                return {
                  ...option,
                  votes: option.votes - 1,
                  voters: option.voters.filter(id => id !== currentUser.id)
                };
              } else {
                return {
                  ...option,
                  votes: option.votes + 1,
                  voters: [...option.voters, currentUser.id]
                };
              }
            }
          }
          return option;
        });
        
        return { ...poll, options: updatedOptions };
      }
      return poll;
    }));
  };
  
  // Group and conversation functions
  const createGroup = () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) return;
    
    const currentUser = users.find(u => u.username === 'admin') || users[0];
    if (!currentUser) return;
    
    const newGroup: Group = {
      id: `group_${Date.now()}`,
      name: newGroupName,
      description: newGroupDescription,
      members: [...selectedMembers, currentUser.id],
      admins: [currentUser.id],
      createdBy: currentUser.id,
      createdAt: new Date(),
      isArchived: false,
      permissions: {
        canMembersAddOthers: true,
        canMembersSendMessages: true,
        canMembersEditInfo: false,
        canMembersPinMessages: false
      },
      settings: {
        onlyAdminsCanEdit: false,
        onlyAdminsCanPin: false,
        showJoinLeaveMessages: true,
        enableAntiSpam: true,
        maxFileSize: 100
      }
    };
    
    setGroups(prev => [...prev, newGroup]);
    
    const newConversation: Conversation = {
      id: newGroup.id,
      type: 'group',
      name: newGroup.name,
      participants: newGroup.members,
      unreadCount: 0,
      isArchived: false,
      isMuted: false,
      isPinned: false
    };
    
    setConversations(prev => [...prev, newConversation]);
    setShowNewGroupModal(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setSelectedMembers([]);
  };
  
  // Updated function to properly edit groups
  const updateGroup = () => {
    if (!selectedGroup) return;
    
    // Ensure all required fields are set
    const updatedGroup = {
      ...selectedGroup,
      settings: {
        onlyAdminsCanEdit: selectedGroup.settings?.onlyAdminsCanEdit || false,
        onlyAdminsCanPin: selectedGroup.settings?.onlyAdminsCanPin || false,
        showJoinLeaveMessages: selectedGroup.settings?.showJoinLeaveMessages !== false,
        enableAntiSpam: selectedGroup.settings?.enableAntiSpam !== false,
        maxFileSize: selectedGroup.settings?.maxFileSize || 100
      }
    };
    
    setGroups(prev => prev.map(group => 
      group.id === updatedGroup.id ? updatedGroup : group
    ));
    
    // Update conversation name
    setConversations(prev => prev.map(conv => 
      conv.id === updatedGroup.id ? { ...conv, name: updatedGroup.name } : conv
    ));
    
    setShowGroupSettingsModal(false);
    setSelectedGroup(null);
  };
  
  const deleteGroup = () => {
    if (!selectedGroup) return;
    
    if (confirm('آیا از حذف این گروه اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
      setGroups(prev => prev.filter(group => group.id !== selectedGroup.id));
      setConversations(prev => prev.filter(conv => conv.id !== selectedGroup.id));
      setMessages(prev => prev.filter(message => message.groupId !== selectedGroup.id));
      
      if (activeConversation === selectedGroup.id) {
        setActiveConversation(null);
      }
      
      setShowGroupSettingsModal(false);
      setSelectedGroup(null);
    }
  };
  
  const addMemberToGroup = (userId: string) => {
    if (!selectedGroup) return;
    
    setSelectedGroup(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        members: [...prev.members, userId]
      };
    });
    
    // Update conversation
    setConversations(prev => prev.map(conv => 
      conv.id === selectedGroup.id 
        ? { ...conv, participants: [...conv.participants, userId] }
        : conv
    ));
  };
  
  const removeMemberFromGroup = (userId: string) => {
    if (!selectedGroup) return;
    
    setSelectedGroup(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        members: prev.members.filter(id => id !== userId),
        admins: prev.admins.filter(id => id !== userId)
      };
    });
    
    // Update conversation
    setConversations(prev => prev.map(conv => 
      conv.id === selectedGroup.id 
        ? { ...conv, participants: conv.participants.filter(id => id !== userId) }
        : conv
    ));
  };
  
  const toggleAdminRole = (userId: string) => {
    if (!selectedGroup) return;
    
    setSelectedGroup(prev => {
      if (!prev) return prev;
      
      const isAdmin = prev.admins.includes(userId);
      
      return {
        ...prev,
        admins: isAdmin 
          ? prev.admins.filter(id => id !== userId)
          : [...prev.admins, userId]
      };
    });
  };
  
  const createPrivateConversation = () => {
    if (!selectedPrivateUser) return;
    
    const currentUser = users.find(u => u.username === 'admin') || users[0];
    if (!currentUser) return;
    
    const otherUser = users.find(u => u.id === selectedPrivateUser);
    if (!otherUser) return;
    
    const existingConv = conversations.find(c => 
      c.type === 'private' && 
      c.participants.includes(currentUser.id) && 
      c.participants.includes(selectedPrivateUser)
    );
    
    if (existingConv) {
      setActiveConversation(existingConv.id);
      setShowPrivateModal(false);
      setSelectedPrivateUser('');
      return;
    }
    
    const newConversation: Conversation = {
      id: `private_${Date.now()}`,
      type: 'private',
      name: otherUser.fullName,
      participants: [currentUser.id, selectedPrivateUser],
      unreadCount: 0,
      isArchived: false,
      isMuted: false,
      isPinned: false
    };
    
    setConversations(prev => [...prev, newConversation]);
    setActiveConversation(newConversation.id);
    setShowPrivateModal(false);
    setSelectedPrivateUser('');
  };
  
  const createBroadcastList = () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) return;
    
    const currentUser = users.find(u => u.username === 'admin') || users[0];
    if (!currentUser) return;
    
    const newBroadcastList: BroadcastListSettings = {
      id: `broadcast_${Date.now()}`,
      name: newGroupName,
      description: newGroupDescription,
      members: [currentUser.id, ...selectedMembers],
      createdBy: currentUser.id,
      createdAt: new Date(),
      allowReplies: false,
      showDeliveryStatus: true,
      maxMessageSize: 100
    };
    
    setBroadcastLists(prev => [...prev, newBroadcastList]);
    
    const newConversation: Conversation = {
      id: newBroadcastList.id,
      type: 'broadcast',
      name: newBroadcastList.name,
      participants: newBroadcastList.members,
      unreadCount: 0,
      isArchived: false,
      isMuted: false,
      isPinned: false
    };
    
    setConversations(prev => [...prev, newConversation]);
    setShowBroadcastModal(false);
    setNewGroupName('');
    setNewGroupDescription('');
    setSelectedMembers([]);
  };
  
  const updateBroadcastList = () => {
    if (!selectedBroadcastList) return;
    
    setBroadcastLists(prev => prev.map(list => 
      list.id === selectedBroadcastList.id ? selectedBroadcastList : list
    ));
    
    // Update conversation name
    setConversations(prev => prev.map(conv => 
      conv.id === selectedBroadcastList.id ? { ...conv, name: selectedBroadcastList.name } : conv
    ));
    
    setShowBroadcastSettingsModal(false);
    setSelectedBroadcastList(null);
  };
  
  const deleteBroadcastList = () => {
    if (!selectedBroadcastList) return;
    
    if (confirm('آیا از حذف این لیست پخش اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
      setBroadcastLists(prev => prev.filter(list => list.id !== selectedBroadcastList.id));
      setConversations(prev => prev.filter(conv => conv.id !== selectedBroadcastList.id));
      
      // Also delete related messages
      setMessages(prev => prev.filter(m => 
        !(m.senderId === selectedBroadcastList.createdBy && 
          m.receiverId && selectedBroadcastList.members.includes(m.receiverId))
      ));
      
      if (activeConversation === selectedBroadcastList.id) {
        setActiveConversation(null);
      }
      
      setShowBroadcastSettingsModal(false);
      setSelectedBroadcastList(null);
    }
  };
  
  const updateUser = () => {
    if (!selectedUser) return;
    
    setUsers(prev => prev.map(user => 
      user.id === selectedUser.id ? selectedUser : user
    ));
    
    setShowUserEditModal(false);
    setSelectedUser(null);
  };
  
  const toggleArchiveConversation = (conversationId: string) => {
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId
        ? { ...conv, isArchived: !conv.isArchived }
        : conv
    ));
  };
  
  const toggleMuteConversation = (conversationId: string) => {
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId
        ? { ...conv, isMuted: !conv.isMuted }
        : conv
    ));
  };
  
  const togglePinConversation = (conversationId: string) => {
    setConversations(prev => prev.map(conv =>
      conv.id === conversationId
        ? { ...conv, isPinned: !conv.isPinned }
        : conv
    ));
  };
  
  // Tag functions
  const createTag = () => {
    if (!newTagName.trim()) return;
    
    const newTag = `${newTagName}:${newTagColor}`;
    setConversationTags(prev => [...prev, newTag]);
    setNewTagName('');
    setNewTagColor('#3B82F6');
  };
  
  const deleteTag = (tag: string) => {
    setConversationTags(prev => prev.filter(t => t !== tag));
    
    // Remove tag from conversations
    setConversations(prev => prev.map(conv => ({
      ...conv,
      tags: conv.tags?.filter(t => t !== tag) || []
    })));
  };
  
  const addTagToConversation = (conversationId: string, tag: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId
        ? { 
            ...conv, 
            tags: [...(conv.tags || []), tag] 
          }
        : conv
    ));
  };
  
  const removeTagFromConversation = (conversationId: string, tag: string) => {
    setConversations(prev => prev.map(conv => 
      conv.id === conversationId
        ? { 
            ...conv, 
            tags: conv.tags?.filter(t => t !== tag) || [] 
          }
        : conv
    ));
  };
  
  // Utility functions
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };
  
  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  const getUserStatus = (userId: string) => {
    return userStatuses.find(s => s.userId === userId);
  };
  
  const getMessagePoll = (pollId: string) => {
    return polls.find(p => p.id === pollId);
  };
  
  const getReplyToMessage = (replyToId: string) => {
    return messages.find(m => m.id === replyToId);
  };
  
  const parseTag = (tagString: string) => {
    const [name, color] = tagString.split(':');
    return { name, color: color || '#3B82F6' };
  };
  
  // Filter and sort conversations
  const filteredConversations = conversations.filter(conv => {
    if (showArchived && !conv.isArchived) return false;
    if (!showArchived && conv.isArchived) return false;
    if (showPrivateConversations && conv.type !== 'private') return false;
    if (!showPrivateConversations && !showArchived && conv.type === 'private') return false;
    if (selectedTag && !conv.tags?.includes(selectedTag)) return false;
    
    return conv.name.toLowerCase().includes(searchTerm.toLowerCase());
  });
  
  const sortedConversations = [...filteredConversations].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    
    const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
    
    return bTime - aTime;
  });
  
  // Get active conversation data
  const activeConversationData = conversations.find(c => c.id === activeConversation);
  
  const conversationMessages = messages.filter(m => {
    if (!activeConversationData) return false;
    
    if (activeConversationData.type === 'group' && m.groupId === activeConversation) {
      return true;
    }
    
    if (activeConversationData.type === 'private' && 
        ((m.senderId && activeConversationData.participants.includes(m.senderId)) &&
         (m.receiverId && activeConversationData.participants.includes(m.receiverId)))) {
      return true;
    }
    
    if (activeConversationData.type === 'broadcast' && 
        m.senderId === activeConversationData.participants[0] && 
        m.receiverId && activeConversationData.participants.includes(m.receiverId)) {
      return true;
    }
    
    return false;
  });
  
  const searchedMessages = messageSearchTerm 
    ? conversationMessages.filter(m => 
        m.content.toLowerCase().includes(messageSearchTerm.toLowerCase())
      )
    : conversationMessages;
  
  const pinnedMessages = activeConversationData?.type === 'group'
    ? conversationMessages.filter(m => m.isPinned)
    : [];
  
  // Archive functions
  const archivedConversations = conversations.filter(conv => conv.isArchived);
  
  const filteredArchivedConversations = archivedConversations.filter(conv => {
    if (archiveFilter === 'groups' && conv.type !== 'group') return false;
    if (archiveFilter === 'private' && conv.type !== 'private') return false;
    
    return conv.name.toLowerCase().includes(archiveSearchTerm.toLowerCase());
  });
  
  // Render
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-7xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">پیام‌رسان سازمانی</h1>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>ارتباطات سریع و امن در سازمان شما</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowArchiveModal(true)}
              className={`p-3 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}
              title="آرشیو گفتگوها"
            >
              <Archive className="h-5 w-5" />
            </button>
            <button
              onClick={toggleDarkMode}
              className={`p-3 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'} border ${darkMode ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}
              title={darkMode ? 'حالت روز' : 'حالت شب'}
            >
              {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>
            <img 
              src="/لوگو صنعت غذایی کورش.jpg" 
              alt="لوگو شرکت" 
              className="h-16 w-auto rounded-lg shadow-md"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className={`rounded-2xl border p-5 mb-6 shadow-lg ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold">گفتگوها</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowNewGroupModal(true)}
                    className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-blue-700 hover:bg-blue-600' : 'bg-blue-600 hover:bg-blue-700'} text-white shadow-md`}
                    title="گروه جدید"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowPrivateModal(true)}
                    className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-green-700 hover:bg-green-600' : 'bg-green-600 hover:bg-green-700'} text-white shadow-md`}
                    title="گفتگوی خصوصی"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowBroadcastModal(true)}
                    className={`p-2 rounded-full transition-colors ${darkMode ? 'bg-purple-700 hover:bg-purple-600' : 'bg-purple-600 hover:bg-purple-700'} text-white shadow-md`}
                    title="لیست پخش"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Tags */}
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">برچسب‌ها</span>
                  <button
                    onClick={() => setShowTagManager(!showTagManager)}
                    className="text-xs px-2 py-1 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    {showTagManager ? 'بستن' : 'مدیریت'}
                  </button>
                </div>
                
                {showTagManager ? (
                  <div className="space-y-3 p-3 rounded-lg bg-gray-100 dark:bg-gray-700">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="نام برچسب"
                        className={`flex-1 px-3 py-2 rounded-lg text-sm ${
                          darkMode ? 'bg-gray-600 text-white' : 'bg-white'
                        }`}
                      />
                      <input
                        type="color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer"
                      />
                      <button
                        onClick={createTag}
                        className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {conversationTags.map(tag => {
                        const { name, color } = parseTag(tag);
                        return (
                          <div key={tag} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: color }}
                              ></div>
                              <span className="text-sm">{name}</span>
                            </div>
                            <button
                              onClick={() => deleteTag(tag)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedTag(null)}
                      className={`text-xs px-3 py-1 rounded-full ${
                        selectedTag === null 
                          ? (darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white') 
                          : (darkMode ? 'bg-gray-700' : 'bg-gray-200')
                      }`}
                    >
                      همه
                    </button>
                    {conversationTags.map(tag => {
                      const { name, color } = parseTag(tag);
                      return (
                        <button
                          key={tag}
                          onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                          className={`text-xs px-3 py-1 rounded-full flex items-center gap-1 ${
                            selectedTag === tag 
                              ? 'text-white' 
                              : (darkMode ? 'text-gray-300' : 'text-gray-700')
                          }`}
                          style={{ 
                            backgroundColor: selectedTag === tag ? color : undefined,
                            border: selectedTag !== tag ? `1px solid ${color}` : undefined
                          }}
                        >
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: selectedTag === tag ? 'white' : color }}
                          ></div>
                          {name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* View Options */}
              <div className="mb-5 space-y-2">
                <button
                  onClick={() => {
                    setShowArchived(false);
                    setShowPrivateConversations(false);
                  }}
                  className={`w-full text-right p-3 rounded-xl transition-colors flex items-center ${
                    !showArchived && !showPrivateConversations 
                      ? (darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-50 text-blue-700') 
                      : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                  }`}
                >
                  <Users className="h-5 w-5 ml-3" />
                  <div>
                    <div className="font-medium">گروه‌ها</div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>گفتگوهای گروهی</div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    setShowPrivateConversations(true);
                    setShowArchived(false);
                  }}
                  className={`w-full text-right p-3 rounded-xl transition-colors flex items-center ${
                    showPrivateConversations 
                      ? (darkMode ? 'bg-green-900 text-green-200' : 'bg-green-50 text-green-700') 
                      : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                  }`}
                >
                  <Lock className="h-5 w-5 ml-3" />
                  <div>
                    <div className="font-medium">خصوصی</div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>گفتگوهای دو نفره و محرمانه</div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    setShowArchived(true);
                    setShowPrivateConversations(false);
                  }}
                  className={`w-full text-right p-3 rounded-xl transition-colors flex items-center ${
                    showArchived 
                      ? (darkMode ? 'bg-orange-900 text-orange-200' : 'bg-orange-50 text-orange-700') 
                      : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                  }`}
                >
                  <Archive className="h-5 w-5 ml-3" />
                  <div>
                    <div className="font-medium">آرشیو</div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>مشاهده گفتگوهای آرشیو شده</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveConversation('starred')}
                  className={`w-full text-right p-3 rounded-xl transition-colors flex items-center ${
                    activeConversation === 'starred' 
                      ? (darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-50 text-yellow-700') 
                      : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                  }`}
                >
                  <Star className="h-5 w-5 ml-3" />
                  <div>
                    <div className="font-medium">ستاره‌دار</div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>پیام‌های ستاره‌دار</div>
                  </div>
                </button>
                
                <button
                  onClick={() => setActiveConversation('scheduled')}
                  className={`w-full text-right p-3 rounded-xl transition-colors flex items-center ${
                    activeConversation === 'scheduled' 
                      ? (darkMode ? 'bg-indigo-900 text-indigo-200' : 'bg-indigo-50 text-indigo-700') 
                      : (darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50')
                  }`}
                >
                  <Clock className="h-5 w-5 ml-3" />
                  <div>
                    <div className="font-medium">برنامه‌ریزی شده</div>
                    <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>پیام‌های زمان‌بندی شده</div>
                  </div>
                </button>
              </div>
              
              {/* Search */}
              <div className="relative mb-5">
                <Search className={`absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="جستجو در گفتگوها..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className={`w-full pr-12 pl-4 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'border border-gray-300'
                  }`}
                />
              </div>
              
              {/* Conversations List */}
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {sortedConversations.map(conversation => {
                  const userStatus = conversation.type === 'private' 
                    ? getUserStatus(conversation.participants.find(p => p !== (users.find(u => u.username === 'admin')?.id)) || '')
                    : null;
                    
                  return (
                    <div
                      key={conversation.id}
                      onClick={() => setActiveConversation(conversation.id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all ${
                        activeConversation === conversation.id
                          ? (darkMode ? 'bg-blue-900 border-blue-700' : 'bg-blue-50 border-blue-200')
                          : (darkMode ? 'hover:bg-gray-700 border-transparent' : 'hover:bg-gray-50 border-transparent')
                      } border`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            conversation.type === 'group' ? 'bg-blue-500' : 
                            conversation.type === 'broadcast' ? 'bg-purple-500' : 'bg-green-500'
                          } text-white`}>
                            {conversation.type === 'group' ? (
                              <Users className="h-5 w-5" />
                            ) : conversation.type === 'broadcast' ? (
                              <Send className="h-5 w-5" />
                            ) : (
                              <Lock className="h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <span className="font-medium">{conversation.name}</span>
                            {conversation.type === 'private' && userStatus && (
                              <div className="text-xs flex items-center gap-1 mt-1">
                                <span className={`inline-block w-2 h-2 rounded-full ${
                                  userStatus.status === 'online' ? 'bg-green-500' : 
                                  userStatus.status === 'away' ? 'bg-yellow-500' : 'bg-gray-500'
                                }`}></span>
                                {userStatus.status === 'online' ? 'آنلاین' : 
                                 userStatus.status === 'away' ? 'مشغول' : 
                                 userStatus.lastSeen ? `آخرین بازدید: ${formatPersianDate(userStatus.lastSeen)}` : 'آفلاین'}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {conversation.isPinned && <Pin className="h-4 w-4 text-yellow-500" />}
                          {conversation.isMuted && <BellOff className="h-4 w-4 text-gray-500" />}
                          {conversation.unreadCount > 0 && (
                            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                              {conversation.unreadCount}
                            </span>
                          )}
                          {/* Added edit button for groups */}
                          {conversation.type === 'group' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const group = groups.find(g => g.id === conversation.id);
                                if (group) {
                                  setSelectedGroup(group);
                                  setShowGroupSettingsModal(true);
                                }
                              }}
                              className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                              title="ویرایش اعضا"
                            >
                              <UserCheck className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleArchiveConversation(conversation.id);
                            }}
                            className={`${darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-400 hover:text-gray-600'}`}
                            title={conversation.isArchived ? 'بازگشت از آرشیو' : 'آرشیو'}
                          >
                            {conversation.isArchived ? (
                              <ArchiveRestore className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      
                      {/* Tags */}
                      {conversation.tags && conversation.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {conversation.tags.slice(0, 3).map(tag => {
                            const { name, color } = parseTag(tag);
                            return (
                              <span
                                key={tag}
                                className="text-xs px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: color + '40', color }}
                              >
                                {name}
                              </span>
                            );
                          })}
                          {conversation.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{conversation.tags.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      
                      {conversation.lastMessage && (
                        <div className={`text-xs mt-2 truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {conversation.lastMessage.content}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Chat Area */}
          <div className="lg:col-span-3">
            {activeConversation === 'starred' ? (
              <div className={`rounded-2xl border h-[70vh] flex flex-col shadow-xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                {/* Chat Header */}
                <div className={`p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center text-white">
                        <Star className="h-5 w-5" />
                      </div>
                      <h3 className="text-xl font-bold">پیام‌های ستاره‌دار</h3>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={saveConversation}
                        className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title="ذخیره گفتگو"
                      >
                        <Save className="h-5 w-5" />
                      </button>
                      <button
                        onClick={preparePrintContent}
                        className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title="چاپ گفتگو"
                      >
                        <Printer className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {starredMessages.length === 0 ? (
                    <div className="text-center py-16">
                      <Star className="h-16 w-16 mx-auto mb-5 text-gray-400" />
                      <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>هیچ پیام ستاره‌داری وجود ندارد</p>
                    </div>
                  ) : (
                    starredMessages.map(message => {
                      const sender = users.find(u => u.id === message.senderId);
                      const isCurrentUser = message.senderId === (users.find(u => u.username === 'admin') || users[0])?.id;
                      
                      return (
                        <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl transition-all message-bubble ${
                            isCurrentUser 
                              ? (darkMode ? 'bg-blue-700' : 'bg-blue-600 text-white') 
                              : (darkMode ? 'bg-gray-700' : 'bg-gray-200 text-gray-900')
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              {!isCurrentUser && (
                                <div className="text-sm font-medium opacity-75">
                                  {sender?.fullName || 'کاربر ناشناس'}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                {message.isPinned && <Pin className="h-4 w-4 text-yellow-500" />}
                                {message.isStarred && <Star className="h-4 w-4 text-yellow-500" />}
                              </div>
                            </div>
                            
                            <div className="text-sm">{message.content}</div>
                            
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {message.attachments.map(attachment => (
                                  <div key={attachment.id} className={`flex items-center gap-2 p-3 rounded-xl ${
                                    darkMode ? 'bg-black bg-opacity-20' : 'bg-black bg-opacity-10'
                                  }`}>
                                    {attachment.fileType.startsWith('image/') ? (
                                      <Image className="h-5 w-5" />
                                    ) : attachment.fileType.startsWith('audio/') ? (
                                      <Mic className="h-5 w-5" />
                                    ) : (
                                      <File className="h-5 w-5" />
                                    )}
                                    <span className="text-sm flex-1 truncate">{attachment.fileName}</span>
                                    <button
                                      onClick={() => downloadFile(attachment)}
                                      className="text-sm hover:underline flex items-center gap-1"
                                      title="دانلود فایل"
                                    >
                                      <Download className="h-4 w-4" />
                                      دانلود
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            <div className={`text-xs mt-2 opacity-75 ${isCurrentUser ? 'text-blue-100' : ''}`}>
                              {formatPersianDateTime(message.timestamp)}
                              {message.isEdited && <span className="mr-2">(ویرایش شده)</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : activeConversation === 'scheduled' ? (
              <div className={`rounded-2xl border h-[70vh] flex flex-col shadow-xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                {/* Chat Header */}
                <div className={`p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                      <Clock className="h-5 w-5" />
                    </div>
                    <h3 className="text-xl font-bold">پیام‌های برنامه‌ریزی شده</h3>
                  </div>
                </div>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {scheduledMessages.length === 0 ? (
                    <div className="text-center py-16">
                      <Clock className="h-16 w-16 mx-auto mb-5 text-gray-400" />
                      <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>هیچ پیام برنامه‌ریزی شده‌ای وجود ندارد</p>
                    </div>
                  ) : (
                    scheduledMessages.map(message => {
                      const conversation = conversations.find(c => 
                        (c.type === 'private' && c.participants.includes(message.receiverId || '')) ||
                        (c.type === 'group' && c.id === message.groupId)
                      );
                      
                      return (
                        <div key={message.id} className={`p-5 rounded-2xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="font-medium text-lg">
                              {message.content.substring(0, 50)}
                              {message.content.length > 50 ? '...' : ''}
                            </div>
                            <div className="text-sm font-medium">
                              {message.scheduledFor && formatPersianDateTime(message.scheduledFor)}
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="text-sm opacity-75">
                              به: {conversation?.name || 'ناشناس'}
                            </div>
                            <div className="flex gap-3">
                              <button
                                onClick={() => {
                                  setNewMessage(message.content);
                                  setActiveConversation(conversation?.id || null);
                                }}
                                className="text-sm px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                              >
                                ویرایش
                              </button>
                              <button
                                onClick={() => {
                                  setScheduledMessages(prev => prev.filter(m => m.id !== message.id));
                                }}
                                className="text-sm px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 transition-colors"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ) : activeConversation ? (
              <div className={`rounded-2xl border h-[70vh] flex flex-col shadow-xl ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                {/* Chat Header */}
                <div className={`p-5 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        activeConversationData?.type === 'group' ? 'bg-blue-500' : 
                        activeConversationData?.type === 'broadcast' ? 'bg-purple-500' : 'bg-green-500'
                      } text-white`}>
                        {activeConversationData?.type === 'group' ? (
                          <Users className="h-6 w-6" />
                        ) : activeConversationData?.type === 'broadcast' ? (
                          <Send className="h-6 w-6" />
                        ) : (
                          <Lock className="h-6 w-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{activeConversationData?.name}</h3>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {activeConversationData?.participants.length} عضو
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Updated group settings button */}
                      {activeConversationData?.type === 'group' && (
                        <button
                          onClick={() => {
                            const group = groups.find(g => g.id === activeConversation);
                            if (group) {
                              setSelectedGroup(group);
                              setShowGroupSettingsModal(true);
                            }
                          }}
                          className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                          title="تنظیمات گروه"
                        >
                          <Settings className="h-5 w-5" />
                        </button>
                      )}
                      
                      {activeConversationData?.type === 'broadcast' && (
                        <button
                          onClick={() => {
                            const broadcastList = broadcastLists.find(bl => bl.id === activeConversation);
                            if (broadcastList) {
                              setSelectedBroadcastList(broadcastList);
                              setShowBroadcastSettingsModal(true);
                            }
                          }}
                          className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          title="تنظیمات لیست پخش"
                        >
                          <Settings className="h-5 w-5" />
                        </button>
                      )}
                      
                      {activeConversationData?.type === 'private' && (
                        <button
                          onClick={() => {
                            const otherUserId = activeConversationData.participants.find(p => p !== (users.find(u => u.username === 'admin')?.id));
                            if (otherUserId) {
                              const user = users.find(u => u.id === otherUserId);
                              if (user) {
                                setSelectedUser(user);
                                setShowUserEditModal(true);
                              }
                            }
                          }}
                          className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          title="ویرایش اطلاعات کاربر"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                      )}
                      
                      {activeConversationData?.type === 'private' && (
                        <button
                          onClick={() => alert('در حال برقراری تماس صوتی...')}
                          className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          title="تماس صوتی"
                        >
                          <Phone className="h-5 w-5" />
                        </button>
                      )}
                      
                      {activeConversationData?.type === 'private' && (
                        <button
                          onClick={() => alert('در حال برقراری تماس تصویری...')}
                          className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                          title="تماس تصویری"
                        >
                          <Video className="h-5 w-5" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => toggleMuteConversation(activeConversation)}
                        className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title={activeConversationData?.isMuted ? "فعال کردن اعلان‌ها" : "بی‌صدا کردن"}
                      >
                        {activeConversationData?.isMuted ? (
                          <BellOff className="h-5 w-5" />
                        ) : (
                          <Bell className="h-5 w-5" />
                        )}
                      </button>
                      
                      <button
                        onClick={() => togglePinConversation(activeConversation)}
                        className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title={activeConversationData?.isPinned ? "حذف پین" : "پین کردن"}
                      >
                        <Pin className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          if (confirm('آیا از حذف این گفتگو اطمینان دارید؟')) {
                            deleteConversation(activeConversation);
                          }
                        }}
                        className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title="حذف گفتگو"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={() => {
                          // Show conversation info
                          alert('اطلاعات گفتگو');
                        }}
                        className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title="اطلاعات بیشتر"
                      >
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Pinned Messages */}
                {pinnedMessages.length > 0 && (
                  <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Pin className="h-5 w-5 text-yellow-500" />
                      <span className="text-sm font-medium">پیام‌های پین شده</span>
                    </div>
                    <div className="flex overflow-x-auto gap-3 pb-2">
                      {pinnedMessages.map(message => (
                        <div
                          key={message.id}
                          className={`flex-shrink-0 p-3 rounded-xl max-w-xs ${darkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'}`}
                        >
                          <div className="text-sm truncate">{message.content}</div>
                          <div className="text-xs opacity-75 mt-1">
                            {formatPersianDateTime(message.timestamp)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Typing Indicator */}
                {typingStatus.length > 0 && (
                  <div className={`px-5 py-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {typingStatus.length === 1 ? (
                      <span>{typingStatus[0].userName} در حال نوشتن است...</span>
                    ) : (
                      <span>چند نفر در حال نوشتن هستند...</span>
                    )}
                  </div>
                )}
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {forwardingMessage && (
                    <div className={`text-center p-4 rounded-xl mb-5 ${darkMode ? 'bg-blue-900' : 'bg-blue-50'}`}>
                      <p className="text-sm">یک گفتگو را برای ارسال پیام انتخاب کنید</p>
                      <button
                        onClick={() => setForwardingMessage(null)}
                        className="text-sm mt-3 text-blue-500 hover:underline"
                      >
                        انصراف
                      </button>
                    </div>
                  )}
                  
                  {showMessageSearch && (
                    <div className={`mb-5 p-4 rounded-xl ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                      <div className="flex items-center gap-3">
                        <Search className="h-5 w-5" />
                        <input
                          type="text"
                          placeholder="جستجو در پیام‌ها..."
                          value={messageSearchTerm}
                          onChange={(e) => setMessageSearchTerm(e.target.value)}
                          className={`flex-1 px-3 py-2 rounded-lg focus:outline-none ${
                            darkMode ? 'bg-gray-600 text-white' : 'bg-white'
                          }`}
                        />
                        <button
                          onClick={() => {
                            setShowMessageSearch(false);
                            setMessageSearchTerm('');
                          }}
                          className="p-2 rounded-full hover:bg-gray-500"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {searchedMessages.length === 0 ? (
                    <div className="text-center py-16">
                      <MessageCircle className="h-16 w-16 mx-auto mb-5 text-gray-400" />
                      <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {messageSearchTerm ? 'هیچ پیامی یافت نشد' : 'گفتگویی را شروع کنید'}
                      </p>
                    </div>
                  ) : (
                    searchedMessages.map(message => {
                      const sender = users.find(u => u.id === message.senderId);
                      const isCurrentUser = message.senderId === (users.find(u => u.username === 'admin') || users[0])?.id;
                      const replyToMessage = message.replyTo ? getReplyToMessage(message.replyTo) : null;
                      const poll = message.pollId ? getMessagePoll(message.pollId) : null;
                      
                      return (
                        <div key={message.id} className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl transition-all message-bubble ${
                            isCurrentUser 
                              ? (darkMode ? 'bg-blue-700' : 'bg-blue-600 text-white') 
                              : (darkMode ? 'bg-gray-700' : 'bg-gray-200 text-gray-900')
                          }`}>
                            <div className="flex items-center justify-between mb-2">
                              {!isCurrentUser && (
                                <div className="text-sm font-medium opacity-75">
                                  {sender?.fullName || 'کاربر ناشناس'}
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                {message.isPinned && <Pin className="h-4 w-4 text-yellow-500" />}
                                {message.isStarred && <Star className="h-4 w-4 text-yellow-500" />}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMessageOptions(message.id === showMessageOptions ? null : message.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            
                            {replyToMessage && (
                              <div className={`mb-3 p-3 rounded-xl text-xs ${
                                darkMode ? 'bg-gray-600' : 'bg-gray-300'
                              }`}>
                                <div className="font-medium mb-1">
                                  در پاسخ به {replyToMessage.senderName}
                                </div>
                                <div className="truncate">
                                  {replyToMessage.content}
                                </div>
                              </div>
                            )}
                            
                            {message.isForwarded && (
                              <div className={`text-xs mb-2 flex items-center ${isCurrentUser ? 'text-blue-200' : 'text-gray-500'}`}>
                                <Forward className="h-4 w-4 ml-1" />
                                از {message.originalSenderName}
                              </div>
                            )}
                            
                            {message.sticker && (
                              <div className="text-5xl my-3 text-center">
                                {message.sticker}
                              </div>
                            )}
                            
                            {message.content && (
                              <div className="text-sm">{message.content}</div>
                            )}
                            
                            {message.location && (
                              <div className={`mt-3 p-3 rounded-xl ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-5 w-5" />
                                  <div>
                                    <div className="text-sm font-medium">موقعیت مکانی</div>
                                    <div className="text-xs opacity-75">
                                      {message.location.address || `${message.location.latitude}, ${message.location.longitude}`}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {poll && (
                              <div className={`mt-3 p-4 rounded-xl ${darkMode ? 'bg-gray-600' : 'bg-gray-300'}`}>
                                <div className="font-medium mb-3">{poll.question}</div>
                                {(() => {
                                  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
                                  return (
                                    <>
                                      <div className="space-y-3">
                                        {poll.options.map(option => {
                                          const userVote = option.voters.includes(
                                            (users.find(u => u.username === 'admin') || users[0])?.id || ''
                                          );
                                          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
                                          
                                          return (
                                            <div key={option.id}>
                                              <button
                                                onClick={() => voteInPoll(poll.id, option.id)}
                                                disabled={!poll.isAnonymous && !poll.allowsMultipleAnswers && userVote}
                                                className={`w-full text-right p-3 rounded-xl text-sm ${
                                                  userVote 
                                                    ? (darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white') 
                                                    : (darkMode ? 'bg-gray-500 hover:bg-gray-400' : 'bg-gray-400 hover:bg-gray-300')
                                                }`}
                                              >
                                                <div className="flex justify-between items-center">
                                                  <span>{option.text}</span>
                                                  <span>{option.votes} ({percentage.toFixed(1)}%)</span>
                                                </div>
                                                <div className={`w-full h-1.5 mt-2 rounded-full ${
                                                  darkMode ? 'bg-gray-400' : 'bg-gray-300'
                                                }`}>
                                                  <div 
                                                    className={`h-1.5 rounded-full ${
                                                      userVote ? 'bg-blue-400' : 'bg-gray-500'
                                                    }`}
                                                    style={{ width: `${percentage}%` }}
                                                  ></div>
                                                </div>
                                              </button>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <div className={`text-xs mt-3 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                        {totalVotes} رأی • {formatPersianDate(poll.createdAt)}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>
                            )}
                            
                            {message.attachments && message.attachments.length > 0 && (
                              <div className="mt-3 space-y-2">
                                {message.attachments.map(attachment => (
                                  <div key={attachment.id} className={`flex items-center gap-3 p-3 rounded-xl ${
                                    darkMode ? 'bg-black bg-opacity-20' : 'bg-black bg-opacity-10'
                                  }`}>
                                    {attachment.fileType.startsWith('image/') ? (
                                      <Image className="h-5 w-5" />
                                    ) : attachment.fileType.startsWith('audio/') ? (
                                      <Mic className="h-5 w-5" />
                                    ) : attachment.fileType.startsWith('video/') ? (
                                      <Video className="h-5 w-5" />
                                    ) : (
                                      <File className="h-5 w-5" />
                                    )}
                                    <span className="text-sm flex-1 truncate">{attachment.fileName}</span>
                                    {attachment.duration && (
                                      <span className="text-xs opacity-75">
                                        {Math.floor(attachment.duration / 60)}:{attachment.duration % 60 < 10 ? '0' : ''}{attachment.duration % 60}
                                      </span>
                                    )}
                                    <button
                                      onClick={() => downloadFile(attachment)}
                                      className="text-xs hover:underline flex items-center gap-1"
                                      title="دانلود فایل"
                                    >
                                      <Download className="h-4 w-4" />
                                      دانلود
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {message.reactions && message.reactions.length > 0 && (
                              <div className="flex flex-wrap gap-2 mt-3">
                                {Array.from(new Set(message.reactions.map(r => r.emoji))).map(emoji => {
                                  const count = message.reactions?.filter(r => r.emoji === emoji).length || 0;
                                  const userReacted = message.reactions?.some(
                                    r => r.emoji === emoji && r.userId === (users.find(u => u.username === 'admin')?.id || '')
                                  );
                                  
                                  return (
                                    <button
                                      key={emoji}
                                      onClick={() => addReaction(message.id, emoji)}
                                      className={`text-xs px-3 py-1 rounded-full flex items-center ${
                                        userReacted 
                                          ? (darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white') 
                                          : (darkMode ? 'bg-gray-600' : 'bg-gray-300')
                                      }`}
                                    >
                                      {emoji} {count}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                            
                            <div className={`flex justify-between items-center mt-2 text-xs ${
                              isCurrentUser ? 'text-blue-200' : (darkMode ? 'text-gray-400' : 'text-gray-500')
                            }`}>
                              <div>
                                {formatPersianDateTime(message.timestamp)}
                                {message.isEdited && <span className="mr-2">(ویرایش شده)</span>}
                                {message.autoDeleteAt && (
                                  <span className="mr-2">
                                    (حذف خودکار: {formatPersianDateTime(message.autoDeleteAt)})
                                  </span>
                                )}
                              </div>
                              {isCurrentUser && (
                                <div className="flex items-center">
                                  {message.isDelivered ? (
                                    message.isRead ? (
                                      <CheckCheck className="h-4 w-4" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )
                                  ) : (
                                    <Clock className="h-4 w-4" />
                                  )}
                                  
                                  {/* Display seen count */}
                                  {message.seenBy.length > 0 && (
                                    <span className="mr-1">
                                      {message.seenBy.length}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {showMessageOptions === message.id && (
                              <div className={`mt-3 p-3 rounded-xl ${darkMode ? 'bg-gray-600' : 'bg-gray-100'}`}>
                                <div className="grid grid-cols-4 gap-2">
                                  <button
                                    onClick={() => addReaction(message.id, '👍')}
                                    className="p-2 rounded-xl hover:bg-gray-500"
                                    title="پسندیدن"
                                  >
                                    👍
                                  </button>
                                  <button
                                    onClick={() => addReaction(message.id, '❤️')}
                                    className="p-2 rounded-xl hover:bg-gray-500"
                                    title="دوست داشتن"
                                  >
                                    ❤️
                                  </button>
                                  <button
                                    onClick={() => addReaction(message.id, '😂')}
                                    className="p-2 rounded-xl hover:bg-gray-500"
                                    title="خنده"
                                  >
                                    😂
                                  </button>
                                  <button
                                    onClick={() => addReaction(message.id, '😮')}
                                    className="p-2 rounded-xl hover:bg-gray-500"
                                    title="شگفت‌زده"
                                  >
                                    😮
                                  </button>
                                  <button
                                    onClick={() => toggleStarMessage(message.id)}
                                    className={`p-2 rounded-xl flex items-center justify-center ${
                                      message.isStarred ? 'text-yellow-500' : ''
                                    }`}
                                    title={message.isStarred ? "حذف ستاره" : "ستاره‌دار کردن"}
                                  >
                                    <Star className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => togglePinMessage(message.id)}
                                    className={`p-2 rounded-xl flex items-center justify-center ${
                                      message.isPinned ? 'text-yellow-500' : ''
                                    }`}
                                    title={message.isPinned ? "حذف پین" : "پین کردن"}
                                  >
                                    <Pin className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      setReplyingTo(message.id);
                                      setShowMessageOptions(null);
                                    }}
                                    className="p-2 rounded-xl flex items-center justify-center"
                                    title="پاسخ دادن"
                                  >
                                    <Reply className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => forwardMessage(message.id)}
                                    className="p-2 rounded-xl flex items-center justify-center"
                                    title="ارسال به گفتگوی دیگر"
                                  >
                                    <Forward className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => editMessage(message.id)}
                                    className="p-2 rounded-xl flex items-center justify-center"
                                    title="ویرایش پیام"
                                  >
                                    <Edit className="h-5 w-5" />
                                  </button>
                                  <button
                                    onClick={() => deleteMessage(message.id, false)}
                                    className="p-2 rounded-xl flex items-center justify-center text-red-500"
                                    title="حذف برای من"
                                  >
                                    <Trash2 className="h-5 w-5" />
                                  </button>
                                  {isCurrentUser && (
                                    <button
                                      onClick={() => deleteMessage(message.id, true)}
                                      className="p-2 rounded-xl flex items-center justify-center text-red-500"
                                      title="حذف برای همه"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Message Input */}
                <div className={`p-5 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  {replyingTo && (
                    <div className={`mb-4 p-3 rounded-xl flex items-center justify-between ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Reply className="h-5 w-5" />
                        <div>
                          <div className="text-sm font-medium">
                            در پاسخ به {getReplyToMessage(replyingTo)?.senderName}
                          </div>
                          <div className="text-xs truncate max-w-xs">
                            {getReplyToMessage(replyingTo)?.content}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setReplyingTo(null)}
                        className="p-2 rounded-full hover:bg-gray-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  
                  {autoDeleteTime && (
                    <div className={`mb-4 p-3 rounded-xl flex items-center justify-between ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5" />
                        <div className="text-xs">
                          پیام پس از {autoDeleteTime} ساعت حذف خواهد شد
                        </div>
                      </div>
                      <button
                        onClick={() => setAutoDeleteTime(null)}
                        className="p-2 rounded-full hover:bg-gray-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  
                  {attachments.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-3">
                      {attachments.map(attachment => (
                        <div key={attachment.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl ${
                          darkMode ? 'bg-gray-700' : 'bg-gray-100'
                        }`}>
                          {attachment.fileType.startsWith('image/') ? (
                            <Image className="h-5 w-5 text-blue-500" />
                          ) : attachment.fileType.startsWith('audio/') ? (
                            <Mic className="h-5 w-5 text-green-500" />
                          ) : attachment.fileType.startsWith('video/') ? (
                            <Video className="h-5 w-5 text-purple-500" />
                          ) : (
                            <File className="h-5 w-5 text-blue-500" />
                          )}
                          <span className="text-sm truncate max-w-32">{attachment.fileName}</span>
                          {attachment.duration && (
                            <span className="text-xs opacity-75">
                              {Math.floor(attachment.duration / 60)}:{attachment.duration % 60 < 10 ? '0' : ''}{attachment.duration % 60}
                            </span>
                          )}
                          <button
                            onClick={() => removeAttachment(attachment.id)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {selectedLocation && (
                    <div className={`mb-4 p-3 rounded-xl flex items-center justify-between ${
                      darkMode ? 'bg-gray-700' : 'bg-gray-100'
                    }`}>
                      <div className="flex items-center gap-3">
                        <MapPin className="h-5 w-5 text-red-500" />
                        <div className="text-xs">
                          {selectedLocation.address || `${selectedLocation.latitude}, ${selectedLocation.longitude}`}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedLocation(null)}
                        className="p-2 rounded-full hover:bg-gray-500"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  
                  {isRecording && (
                    <div className={`mb-4 p-3 rounded-xl flex items-center justify-between ${
                      darkMode ? 'bg-red-900' : 'bg-red-100'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                        <div className="text-sm">
                          در حال ضبط صدا: {formatRecordingTime(recordingTime)}
                        </div>
                      </div>
                      <button
                        onClick={stopRecording}
                        className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )}
                  
                  <div className="flex items-center gap-3">
                    {/* File Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setShowFileMenu(!showFileMenu)}
                        className={`p-3 rounded-full transition-colors ${
                          darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                        }`}
                        title="ارسال فایل"
                      >
                        <Paperclip className="h-6 w-6" />
                      </button>
                      
                      {showFileMenu && (
                        <div className={`absolute bottom-full left-0 mb-3 w-56 rounded-xl shadow-lg z-10 ${
                          darkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'
                        }`}>
                          <input
                            type="file"
                            id="file-image"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              handleFileUpload(e, 'image');
                              setShowFileMenu(false);
                            }}
                          />
                          <label
                            htmlFor="file-image"
                            className={`flex items-center gap-3 p-4 cursor-pointer ${
                              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                          >
                            <Image className="h-5 w-5" />
                            <span>تصویر</span>
                          </label>
                          
                          <input
                            type="file"
                            id="file-video"
                            accept="video/*"
                            className="hidden"
                            onChange={(e) => {
                              handleFileUpload(e, 'video');
                              setShowFileMenu(false);
                            }}
                          />
                          <label
                            htmlFor="file-video"
                            className={`flex items-center gap-3 p-4 cursor-pointer ${
                              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                          >
                            <Film className="h-5 w-5" />
                            <span>ویدیو</span>
                          </label>
                          
                          <input
                            type="file"
                            id="file-audio"
                            accept="audio/*"
                            className="hidden"
                            onChange={(e) => {
                              handleFileUpload(e, 'audio');
                              setShowFileMenu(false);
                            }}
                          />
                          <label
                            htmlFor="file-audio"
                            className={`flex items-center gap-3 p-4 cursor-pointer ${
                              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                          >
                            <Music className="h-5 w-5" />
                            <span>صدا</span>
                          </label>
                          
                          <input
                            type="file"
                            id="file-document"
                            className="hidden"
                            onChange={(e) => {
                              handleFileUpload(e, 'document');
                              setShowFileMenu(false);
                            }}
                          />
                          <label
                            htmlFor="file-document"
                            className={`flex items-center gap-3 p-4 cursor-pointer ${
                              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                          >
                            <FileText className="h-5 w-5" />
                            <span>سند</span>
                          </label>
                          
                          <div className={`border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}></div>
                          
                          <button
                            onClick={() => {
                              setShowCamera(true);
                              setShowFileMenu(false);
                            }}
                            className={`flex items-center gap-3 p-4 w-full text-right ${
                              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                          >
                            <Camera className="h-5 w-5" />
                            <span>دوربین</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              setShowLocationPicker(true);
                              setShowFileMenu(false);
                            }}
                            className={`flex items-center gap-3 p-4 w-full text-right ${
                              darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                            }`}
                          >
                            <MapPin className="h-5 w-5" />
                            <span>موقعیت مکانی</span>
                          </button>
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => {
                        if (isRecording) {
                          stopRecording();
                        } else {
                          startRecording();
                        }
                      }}
                      className={`p-3 rounded-full transition-colors ${
                        isRecording 
                          ? 'text-red-500 hover:bg-red-100' 
                          : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100')
                      }`}
                      title={isRecording ? "توقف ضبط" : "ضبط صدا"}
                    >
                      <Mic className="h-6 w-6" />
                    </button>
                    
                    <button
                      onClick={() => setShowStickerPicker(!showStickerPicker)}
                      className={`p-3 rounded-full transition-colors ${
                        darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="استیکر"
                    >
                      <Sticker className="h-6 w-6" />
                    </button>
                    
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-3 rounded-full transition-colors ${
                        darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                      }`}
                      title="شکلک"
                    >
                      <Smile className="h-6 w-6" />
                    </button>
                    
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (editingMessage) {
                              saveEditedMessage();
                            } else {
                              sendMessage();
                            }
                          }
                        }}
                        placeholder={editingMessage ? "پیام را ویرایش کنید..." : "پیام خود را بنویسید..."}
                        className={`w-full px-5 py-3 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                            : 'border border-gray-300'
                        }`}
                      />
                      
                      {showEmojiPicker && (
                        <div className={`absolute bottom-full left-0 mb-3 p-3 rounded-xl grid grid-cols-6 gap-2 ${
                          darkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'
                        }`}>
                          {['😀', '😂', '😍', '😎', '😢', '😡', '👍', '👎', '👏', '🙏', '❤️', '💔'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => {
                                setNewMessage(prev => prev + emoji);
                                setShowEmojiPicker(false);
                              }}
                              className="text-2xl p-2 hover:bg-gray-500 rounded-xl"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}
                      
                      {showStickerPicker && selectedStickerPack && (
                        <div className={`absolute bottom-full left-0 mb-3 w-80 rounded-xl shadow-lg ${
                          darkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'
                        }`}>
                          <div className={`p-3 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                            <select
                              value={selectedStickerPack.id}
                              onChange={(e) => {
                                const pack = stickerPacks.find(p => p.id === e.target.value);
                                if (pack) setSelectedStickerPack(pack);
                              }}
                              className={`w-full p-2 rounded-xl ${
                                darkMode ? 'bg-gray-700' : 'bg-gray-100'
                              }`}
                            >
                              {stickerPacks.map(pack => (
                                <option key={pack.id} value={pack.id}>{pack.name}</option>
                              ))}
                            </select>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 p-3">
                            {selectedStickerPack.stickers.map(sticker => (
                              <button
                                key={sticker.id}
                                onClick={() => {
                                  setSelectedSticker(sticker.emoji);
                                  setShowStickerPicker(false);
                                }}
                                className="text-4xl p-3 hover:bg-gray-500 rounded-xl"
                              >
                                {sticker.emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {showLocationPicker && (
                        <div className={`absolute bottom-full left-0 mb-3 p-4 rounded-xl w-80 ${
                          darkMode ? 'bg-gray-700' : 'bg-white border border-gray-200'
                        }`}>
                          <div className="text-sm font-medium mb-3">ارسال موقعیت مکانی</div>
                          <div className="space-y-3">
                            <button
                              onClick={() => {
                                setSelectedLocation({
                                  latitude: 35.6892,
                                  longitude: 51.3890,
                                  address: "تهران، ایران"
                                });
                                setShowLocationPicker(false);
                              }}
                              className={`w-full text-right p-3 rounded-xl text-sm ${
                                darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                              }`}
                            >
                              موقعیت فعلی
                            </button>
                            <button
                              onClick={() => {
                                setSelectedLocation({
                                  latitude: 35.6892,
                                  longitude: 51.3890,
                                  address: "تهران، ایران"
                                });
                                setShowLocationPicker(false);
                              }}
                              className={`w-full text-right p-3 rounded-xl text-sm ${
                                darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                              }`}
                            >
                              انتخاب از نقشه
                            </button>
                            <div className={`text-xs p-3 rounded-xl ${
                              darkMode ? 'bg-gray-600' : 'bg-gray-100'
                            }`}>
                              موقعیت مکانی شما فقط به اعضای این گفتگو نشان داده خواهد شد
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {editingMessage ? (
                      <button
                        onClick={saveEditedMessage}
                        disabled={!newMessage.trim()}
                        className={`p-3 rounded-full transition-colors ${
                          !newMessage.trim() 
                            ? 'opacity-50 cursor-not-allowed' 
                            : (darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700')
                        } text-white`}
                        title="ذخیره تغییرات"
                      >
                        <Check className="h-6 w-6" />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={scheduleMessage}
                          disabled={!newMessage.trim() && attachments.length === 0}
                          className={`p-3 rounded-full transition-colors ${
                            (!newMessage.trim() && attachments.length === 0) 
                              ? 'opacity-50 cursor-not-allowed' 
                              : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100')
                          }`}
                          title="برنامه‌ریزی پیام"
                        >
                          <Clock className="h-6 w-6" />
                        </button>
                        
                        <button
                          onClick={() => {
                            const hours = [1, 6, 12, 24, 72];
                            const selectedHour = hours[hours.indexOf(autoDeleteTime || 0) + 1] || hours[0];
                            setAutoDeleteTime(selectedHour === autoDeleteTime ? null : selectedHour);
                          }}
                          className={`p-3 rounded-full transition-colors ${
                            darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                          } ${autoDeleteTime ? 'text-yellow-500' : ''}`}
                          title={`حذف خودکار ${autoDeleteTime ? `(${autoDeleteTime} ساعت)` : ''}`}
                        >
                          <Trash2 className="h-6 w-6" />
                        </button>
                        
                        <button
                          onClick={() => setActivePoll({
                            id: '',
                            question: '',
                            options: [
                              { id: 'opt1', text: '', votes: 0, voters: [] },
                              { id: 'opt2', text: '', votes: 0, voters: [] }
                            ],
                            createdBy: '',
                            createdAt: new Date(),
                            isAnonymous: false,
                            allowsMultipleAnswers: false
                          })}
                          className={`p-3 rounded-full transition-colors ${
                            darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
                          }`}
                          title="ایجاد نظرسنجی"
                        >
                          <Hash className="h-6 w-6" />
                        </button>
                        
                        <button
                          onClick={sendMessage}
                          disabled={!newMessage.trim() && attachments.length === 0 && !selectedLocation && !selectedSticker}
                          className={`p-3 rounded-full transition-colors ${
                            (!newMessage.trim() && attachments.length === 0 && !selectedLocation && !selectedSticker) 
                              ? 'opacity-50 cursor-not-allowed' 
                              : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700')
                          } text-white`}
                        >
                          <Send className="h-6 w-6" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className={`rounded-2xl border h-[70vh] flex items-center justify-center shadow-xl ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              }`}>
                <div className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <MessageCircle className="h-20 w-20 mx-auto mb-5" />
                  <p className="text-xl">گفتگویی را انتخاب کنید</p>
                  <p className="mt-2">برای شروع گفتگو، روی دکمه‌های بالا کلیک کنید</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modals */}
      {showNewGroupModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-8 w-full max-w-2xl shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">ایجاد گروه جدید</h3>
              <button
                onClick={() => {
                  setShowNewGroupModal(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setSelectedMembers([]);
                }}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  نام گروه
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border border-gray-300'
                  }`}
                  placeholder="نام گروه"
                />
              </div>
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  توضیحات
                </label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border border-gray-300'
                  }`}
                  rows={4}
                  placeholder="توضیحات گروه"
                />
              </div>
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  اعضای گروه
                </label>
                <div className={`max-h-60 overflow-y-auto rounded-xl p-4 ${
                  darkMode ? 'bg-gray-700' : 'border border-gray-300'
                }`}>
                  {users.map(user => (
                    <label key={user.id} className={`flex items-center p-3 rounded-xl ${
                      darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers(prev => [...prev, user.id]);
                          } else {
                            setSelectedMembers(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                        className="ml-3 h-5 w-5"
                      />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg">
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{user.fullName}</div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {user.departmentName}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => {
                  setShowNewGroupModal(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setSelectedMembers([]);
                }}
                className={`px-6 py-3 rounded-xl text-lg ${
                  darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                انصراف
              </button>
              <button
                onClick={createGroup}
                disabled={!newGroupName.trim() || selectedMembers.length === 0}
                className={`px-6 py-3 rounded-xl text-lg ${
                  !newGroupName.trim() || selectedMembers.length === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700')
                } text-white`}
              >
                ایجاد گروه
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showGroupSettingsModal && selectedGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-8 w-full max-w-4xl shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">تنظیمات گروه</h3>
              <button
                onClick={() => {
                  setShowGroupSettingsModal(false);
                  setSelectedGroup(null);
                }}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-8">
              {/* Group Info */}
              <div>
                <h4 className="text-lg font-semibold mb-4">اطلاعات گروه</h4>
                <div className="space-y-5">
                  <div>
                    <label className={`block text-base font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      نام گروه
                    </label>
                    <input
                      type="text"
                      value={selectedGroup.name}
                      onChange={(e) => setSelectedGroup({
                        ...selectedGroup,
                        name: e.target.value
                      })}
                      className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-base font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      توضیحات
                    </label>
                    <textarea
                      value={selectedGroup.description}
                      onChange={(e) => setSelectedGroup({
                        ...selectedGroup,
                        description: e.target.value
                      })}
                      className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border border-gray-300'
                      }`}
                      rows={4}
                    />
                  </div>
                </div>
              </div>
              
              {/* Members */}
              <div id="members-edit-section">
                <h4 className="text-lg font-semibold mb-4">اعضا</h4>
                <div className={`max-h-80 overflow-y-auto rounded-xl p-4 ${
                  darkMode ? 'bg-gray-700' : 'border border-gray-300'
                }`}>
                  {selectedGroup.members.map(memberId => {
                    const user = users.find(u => u.id === memberId);
                    if (!user) return null;
                    
                    const isAdmin = selectedGroup.admins.includes(memberId);
                    const isCreator = selectedGroup.createdBy === memberId;
                    
                    return (
                      <div key={memberId} className={`flex items-center justify-between p-3 rounded-xl mb-3 ${
                        darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-xl">
                            {user.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-base font-medium">{user.fullName}</div>
                            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {user.departmentName}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {isCreator && (
                            <span className={`text-sm px-3 py-1 rounded-full ${
                              darkMode ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              سازنده
                            </span>
                          )}
                          {isAdmin && (
                            <span className={`text-sm px-3 py-1 rounded-full ${
                              darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
                            }`}>
                              ادمین
                            </span>
                          )}
                          {selectedGroup.admins.length > 1 && (
                            <button
                              onClick={() => toggleAdminRole(memberId)}
                              className={`p-2 rounded-xl ${
                                darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'
                              }`}
                              title={isAdmin ? "حذف ادمین" : "اضافه کردن ادمین"}
                            >
                              {isAdmin ? <ShieldAlert className="h-5 w-5" /> : <Shield className="h-5 w-5" />}
                            </button>
                          )}
                          {selectedGroup.createdBy !== memberId && (
                            <button
                              onClick={() => removeMemberFromGroup(memberId)}
                              className={`p-2 rounded-xl text-red-500 hover:bg-red-500 hover:bg-opacity-20`}
                              title="حذف عضو"
                            >
                              <UserMinus className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-5">
                  <label className={`block text-base font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    افزودن عضو جدید
                  </label>
                  <div className="flex gap-3">
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addMemberToGroup(e.target.value);
                          e.target.value = '';
                        }
                      }}
                      className={`flex-1 px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border border-gray-300'
                      }`}
                    >
                      <option value="">انتخاب کاربر</option>
                      {users
                        .filter(u => !selectedGroup.members.includes(u.id))
                        .map(user => (
                          <option key={user.id} value={user.id}>
                            {user.fullName} - {user.departmentName}
                          </option>
                        ))}
                    </select>
                    <button
                      onClick={() => {
                        // نمایش لیست کامل اعضا برای ویرایش
                        const editSection = document.getElementById('members-edit-section');
                        if (editSection) {
                          editSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className={`px-5 py-3 rounded-xl ${
                        darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'
                      } text-white`}
                    >
                      ویرایش اعضا
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Permissions */}
              <div>
                <h4 className="text-lg font-semibold mb-4">مجوزها</h4>
                <div className="space-y-4">
                  <label className={`flex items-center p-3 rounded-xl ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedGroup.permissions.canMembersAddOthers}
                      onChange={(e) => setSelectedGroup({
                        ...selectedGroup,
                        permissions: {
                          ...selectedGroup.permissions,
                          canMembersAddOthers: e.target.checked
                        }
                      })}
                      className="ml-3 h-5 w-5"
                    />
                    <span className="text-base">اعضا می‌توانند عضو جدید اضافه کنند</span>
                  </label>
                  
                  <label className={`flex items-center p-3 rounded-xl ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedGroup.permissions.canMembersSendMessages}
                      onChange={(e) => setSelectedGroup({
                        ...selectedGroup,
                        permissions: {
                          ...selectedGroup.permissions,
                          canMembersSendMessages: e.target.checked
                        }
                      })}
                      className="ml-3 h-5 w-5"
                    />
                    <span className="text-base">اعضا می‌توانند پیام ارسال کنند</span>
                  </label>
                  
                  <label className={`flex items-center p-3 rounded-xl ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedGroup.permissions.canMembersEditInfo}
                      onChange={(e) => setSelectedGroup({
                        ...selectedGroup,
                        permissions: {
                          ...selectedGroup.permissions,
                          canMembersEditInfo: e.target.checked
                        }
                      })}
                      className="ml-3 h-5 w-5"
                    />
                    <span className="text-base">اعضا می‌توانند اطلاعات گروه را ویرایش کنند</span>
                  </label>
                  
                  <label className={`flex items-center p-3 rounded-xl ${
                    darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                  }`}>
                    <input
                      type="checkbox"
                      checked={selectedGroup.permissions.canMembersPinMessages}
                      onChange={(e) => setSelectedGroup({
                        ...selectedGroup,
                        permissions: {
                          ...selectedGroup.permissions,
                          canMembersPinMessages: e.target.checked
                        }
                      })}
                      className="ml-3 h-5 w-5"
                    />
                    <span className="text-base">اعضا می‌توانند پیام را پین کنند</span>
                  </label>
                </div>
              </div>
              
              {/* Settings */}
              <div>
                <h4 className="text-lg font-semibold mb-4">تنظیمات پیشرفته</h4>
                <div className="space-y-5">
                  <div>
                    <label className={`block text-base font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      حداکثر حجم فایل (مگابایت)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={selectedGroup.settings.maxFileSize}
                      onChange={(e) => setSelectedGroup({
                        ...selectedGroup,
                        settings: {
                          ...selectedGroup.settings,
                          maxFileSize: parseInt(e.target.value) || 100
                        }
                      })}
                      className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border border-gray-300'
                      }`}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <label className={`flex items-center p-3 rounded-xl ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selectedGroup.settings.onlyAdminsCanEdit}
                        onChange={(e) => setSelectedGroup({
                          ...selectedGroup,
                          settings: {
                            ...selectedGroup.settings,
                            onlyAdminsCanEdit: e.target.checked
                          }
                        })}
                        className="ml-3 h-5 w-5"
                      />
                      <span className="text-base">فقط ادمین‌ها می‌توانند اطلاعات گروه را ویرایش کنند</span>
                    </label>
                    
                    <label className={`flex items-center p-3 rounded-xl ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selectedGroup.settings.onlyAdminsCanPin}
                        onChange={(e) => setSelectedGroup({
                          ...selectedGroup,
                          settings: {
                            ...selectedGroup.settings,
                            onlyAdminsCanPin: e.target.checked
                          }
                        })}
                        className="ml-3 h-5 w-5"
                      />
                      <span className="text-base">فقط ادمین‌ها می‌توانند پیام را پین کنند</span>
                    </label>
                    
                    <label className={`flex items-center p-3 rounded-xl ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selectedGroup.settings.showJoinLeaveMessages}
                        onChange={(e) => setSelectedGroup({
                          ...selectedGroup,
                          settings: {
                            ...selectedGroup.settings,
                            showJoinLeaveMessages: e.target.checked
                          }
                        })}
                        className="ml-3 h-5 w-5"
                      />
                      <span className="text-base">نمایش پیام‌های عضویت و خروج</span>
                    </label>
                    
                    <label className={`flex items-center p-3 rounded-xl ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selectedGroup.settings.enableAntiSpam}
                        onChange={(e) => setSelectedGroup({
                          ...selectedGroup,
                          settings: {
                            ...selectedGroup.settings,
                            enableAntiSpam: e.target.checked
                          }
                        })}
                        className="ml-3 h-5 w-5"
                      />
                      <span className="text-base">فعال کردن محافظت در برابر اسپم</span>
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Danger Zone */}
              <div className={`pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h4 className="text-lg font-semibold mb-4 text-red-500">منطقه خطر</h4>
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      if (confirm('آیا از حذف این گروه اطمینان دارید؟ این عمل غیرقابل بازگشت است.')) {
                        deleteGroup();
                      }
                    }}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                  >
                    حذف گروه
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('آیا از خروج از این گروه اطمینان دارید؟')) {
                        // Remove current user from group
                        const currentUser = users.find(u => u.username === 'admin') || users[0];
                        if (currentUser) {
                          removeMemberFromGroup(currentUser.id);
                        }
                      }
                    }}
                    className="px-6 py-3 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors"
                  >
                    خروج از گروه
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => {
                  setShowGroupSettingsModal(false);
                  setSelectedGroup(null);
                }}
                className={`px-6 py-3 rounded-xl text-lg ${
                  darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                انصراف
              </button>
              <button
                onClick={updateGroup}
                className={`px-6 py-3 rounded-xl text-lg ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showPrivateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-8 w-full max-w-md shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">شروع گفتگوی خصوصی</h3>
              <button
                onClick={() => {
                  setShowPrivateModal(false);
                  setSelectedPrivateUser('');
                }}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  انتخاب کاربر
                </label>
                <select
                  value={selectedPrivateUser}
                  onChange={(e) => setSelectedPrivateUser(e.target.value)}
                  className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border border-gray-300'
                  }`}
                >
                  <option value="">انتخاب کنید</option>
                  {users.filter(u => u.id !== (users.find(u => u.username === 'admin') || users[0])?.id).map(user => (
                    <option key={user.id} value={user.id}>
                      {user.fullName} - {user.departmentName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => {
                  setShowPrivateModal(false);
                  setSelectedPrivateUser('');
                }}
                className={`px-6 py-3 rounded-xl text-lg ${
                  darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                انصراف
              </button>
              <button
                onClick={createPrivateConversation}
                disabled={!selectedPrivateUser}
                className={`px-6 py-3 rounded-xl text-lg ${
                  !selectedPrivateUser
                    ? 'opacity-50 cursor-not-allowed'
                    : (darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700')
                } text-white`}
              >
                شروع گفتگو
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-8 w-full max-w-2xl shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">ایجاد لیست پخش</h3>
              <button
                onClick={() => {
                  setShowBroadcastModal(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setSelectedMembers([]);
                }}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  نام لیست
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border border-gray-300'
                  }`}
                  placeholder="نام لیست"
                />
              </div>
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  توضیحات
                </label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border border-gray-300'
                  }`}
                  rows={4}
                  placeholder="توضیحات لیست"
                />
              </div>
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  اعضای لیست
                </label>
                <div className={`max-h-60 overflow-y-auto rounded-xl p-4 ${
                  darkMode ? 'bg-gray-700' : 'border border-gray-300'
                }`}>
                  {users.filter(u => u.id !== (users.find(u => u.username === 'admin') || users[0])?.id).map(user => (
                    <label key={user.id} className={`flex items-center p-3 rounded-xl ${
                      darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMembers(prev => [...prev, user.id]);
                          } else {
                            setSelectedMembers(prev => prev.filter(id => id !== user.id));
                          }
                        }}
                        className="ml-3 h-5 w-5"
                      />
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white text-lg">
                          {user.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{user.fullName}</div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {user.departmentName}
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className={`p-5 rounded-xl text-base ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                پیام‌های ارسال شده به لیست پخش به صورت جداگانه به هر عضو ارسال می‌شوند. اعضا نمی‌توانند پاسخ دهند.
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => {
                  setShowBroadcastModal(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setSelectedMembers([]);
                }}
                className={`px-6 py-3 rounded-xl text-lg ${
                  darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                انصراف
              </button>
              <button
                onClick={createBroadcastList}
                disabled={!newGroupName.trim() || selectedMembers.length === 0}
                className={`px-6 py-3 rounded-xl text-lg ${
                  !newGroupName.trim() || selectedMembers.length === 0
                    ? 'opacity-50 cursor-not-allowed'
                    : (darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-600 hover:bg-purple-700')
                } text-white`}
              >
                ایجاد لیست
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showBroadcastSettingsModal && selectedBroadcastList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-8 w-full max-w-3xl shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">تنظیمات لیست پخش</h3>
              <button
                onClick={() => {
                  setShowBroadcastSettingsModal(false);
                  setSelectedBroadcastList(null);
                }}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-8">
              {/* List Info */}
              <div>
                <h4 className="text-lg font-semibold mb-4">اطلاعات لیست</h4>
                <div className="space-y-5">
                  <div>
                    <label className={`block text-base font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      نام لیست
                    </label>
                    <input
                      type="text"
                      value={selectedBroadcastList.name}
                      onChange={(e) => setSelectedBroadcastList({
                        ...selectedBroadcastList,
                        name: e.target.value
                      })}
                      className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border border-gray-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className={`block text-base font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      توضیحات
                    </label>
                    <textarea
                      value={selectedBroadcastList.description}
                      onChange={(e) => setSelectedBroadcastList({
                        ...selectedBroadcastList,
                        description: e.target.value
                      })}
                      className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border border-gray-300'
                      }`}
                      rows={4}
                    />
                  </div>
                </div>
              </div>
              
              {/* Members */}
              <div>
                <h4 className="text-lg font-semibold mb-4">اعضا</h4>
                <div className={`max-h-80 overflow-y-auto rounded-xl p-4 ${
                  darkMode ? 'bg-gray-700' : 'border border-gray-300'
                }`}>
                  {selectedBroadcastList.members.map(memberId => {
                    const user = users.find(u => u.id === memberId);
                    if (!user) return null;
                    
                    return (
                      <div key={memberId} className={`flex items-center justify-between p-3 rounded-xl mb-3 ${
                        darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white text-xl">
                            {user.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-base font-medium">{user.fullName}</div>
                            <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {user.departmentName}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedBroadcastList({
                              ...selectedBroadcastList,
                              members: selectedBroadcastList.members.filter(id => id !== memberId)
                            });
                          }}
                          className={`p-2 rounded-xl text-red-500 hover:bg-red-500 hover:bg-opacity-20`}
                          title="حذف عضو"
                        >
                          <UserMinus className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                <div className="mt-5">
                  <label className={`block text-base font-medium mb-2 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    افزودن عضو جدید
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        setSelectedBroadcastList({
                          ...selectedBroadcastList,
                          members: [...selectedBroadcastList.members, e.target.value]
                        });
                        e.target.value = '';
                      }
                    }}
                    className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'border border-gray-300'
                    }`}
                  >
                    <option value="">انتخاب کاربر</option>
                    {users
                      .filter(u => !selectedBroadcastList.members.includes(u.id))
                      .map(user => (
                        <option key={user.id} value={user.id}>
                          {user.fullName} - {user.departmentName}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              
              {/* Settings */}
              <div>
                <h4 className="text-lg font-semibold mb-4">تنظیمات</h4>
                <div className="space-y-5">
                  <div>
                    <label className={`block text-base font-medium mb-2 ${
                      darkMode ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      حداکثر حجم پیام (مگابایت)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={selectedBroadcastList.maxMessageSize}
                      onChange={(e) => setSelectedBroadcastList({
                        ...selectedBroadcastList,
                        maxMessageSize: parseInt(e.target.value) || 100
                      })}
                      className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 text-white' 
                          : 'border border-gray-300'
                      }`}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <label className={`flex items-center p-3 rounded-xl ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selectedBroadcastList.allowReplies}
                        onChange={(e) => setSelectedBroadcastList({
                          ...selectedBroadcastList,
                          allowReplies: e.target.checked
                        })}
                        className="ml-3 h-5 w-5"
                      />
                      <span className="text-base">امکان پاسخ به پیام‌ها</span>
                    </label>
                    
                    <label className={`flex items-center p-3 rounded-xl ${
                      darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={selectedBroadcastList.showDeliveryStatus}
                        onChange={(e) => setSelectedBroadcastList({
                          ...selectedBroadcastList,
                          showDeliveryStatus: e.target.checked
                        })}
                        className="ml-3 h-5 w-5"
                      />
                      <span className="text-base">نمایش وضعیت تحویل پیام‌ها</span>
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Danger Zone */}
              <div className={`pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h4 className="text-lg font-semibold mb-4 text-red-500">منطقه خطر</h4>
                <div className="flex gap-4">
                  <button
                    onClick={deleteBroadcastList}
                    className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
                  >
                    حذف لیست پخش
                  </button>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => {
                  setShowBroadcastSettingsModal(false);
                  setSelectedBroadcastList(null);
                }}
                className={`px-6 py-3 rounded-xl text-lg ${
                  darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                انصراف
              </button>
              <button
                onClick={updateBroadcastList}
                className={`px-6 py-3 rounded-xl text-lg ${
                  darkMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-purple-600 hover:bg-purple-700'
                } text-white`}
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showUserEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-8 w-full max-w-md shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">ویرایش کاربر</h3>
              <button
                onClick={() => {
                  setShowUserEditModal(false);
                  setSelectedUser(null);
                }}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  نام کامل
                </label>
                <input
                  type="text"
                  value={selectedUser.fullName}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    fullName: e.target.value
                  })}
                  className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border border-gray-300'
                  }`}
                />
              </div>
              
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  نام کاربری
                </label>
                <input
                  type="text"
                  value={selectedUser.username}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    username: e.target.value
                  })}
                  className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border border-gray-300'
                  }`}
                />
              </div>
              
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  ایمیل
                </label>
                <input
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    email: e.target.value
                  })}
                  className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border border-gray-300'
                  }`}
                />
              </div>
              
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  بخش
                </label>
                <input
                  type="text"
                  value={selectedUser.departmentName}
                  onChange={(e) => setSelectedUser({
                    ...selectedUser,
                    departmentName: e.target.value
                  })}
                  className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border border-gray-300'
                  }`}
                />
              </div>
              
              <div className="space-y-4">
                <label className={`flex items-center p-3 rounded-xl ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={selectedUser.isActive}
                    onChange={(e) => setSelectedUser({
                      ...selectedUser,
                      isActive: e.target.checked
                    })}
                    className="ml-3 h-5 w-5"
                  />
                  <span className="text-base">فعال</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => {
                  setShowUserEditModal(false);
                  setSelectedUser(null);
                }}
                className={`px-6 py-3 rounded-xl text-lg ${
                  darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                انصراف
              </button>
              <button
                onClick={updateUser}
                className={`px-6 py-3 rounded-xl text-lg ${
                  darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                } text-white`}
              >
                ذخیره تغییرات
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showArchiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-8 w-full max-w-3xl shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">آرشیو گفتگوها</h3>
              <button
                onClick={() => setShowArchiveModal(false)}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex gap-3 mb-4">
                <button
                  onClick={() => setArchiveFilter('all')}
                  className={`px-4 py-2 rounded-full text-sm ${
                    archiveFilter === 'all'
                      ? (darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white')
                      : (darkMode ? 'bg-gray-700' : 'bg-gray-200')
                  }`}
                >
                  همه
                </button>
                <button
                  onClick={() => setArchiveFilter('groups')}
                  className={`px-4 py-2 rounded-full text-sm ${
                    archiveFilter === 'groups'
                      ? (darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white')
                      : (darkMode ? 'bg-gray-700' : 'bg-gray-200')
                  }`}
                >
                  گروه‌ها
                </button>
                <button
                  onClick={() => setArchiveFilter('private')}
                  className={`px-4 py-2 rounded-full text-sm ${
                    archiveFilter === 'private'
                      ? (darkMode ? 'bg-blue-600' : 'bg-blue-500 text-white')
                      : (darkMode ? 'bg-gray-700' : 'bg-gray-200')
                  }`}
                >
                  خصوصی
                </button>
              </div>
              
              <div className="relative">
                <Search className={`absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  placeholder="جستجو در آرشیو..."
                  value={archiveSearchTerm}
                  onChange={(e) => setArchiveSearchTerm(e.target.value)}
                  className={`w-full pr-14 pl-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                      : 'border border-gray-300'
                  }`}
                />
              </div>
            </div>
            
            <div className={`max-h-96 overflow-y-auto rounded-xl ${
              darkMode ? 'bg-gray-700' : 'bg-gray-50'
            }`}>
              {filteredArchivedConversations.length === 0 ? (
                <div className="text-center py-16">
                  <Archive className="h-16 w-16 mx-auto mb-5 text-gray-400" />
                  <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>هیچ گفتگویی در آرشیو وجود ندارد</p>
                </div>
              ) : (
                filteredArchivedConversations.map(conversation => (
                  <div
                    key={conversation.id}
                    className={`p-5 border-b ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          conversation.type === 'group' ? 'bg-blue-500' : 
                          conversation.type === 'broadcast' ? 'bg-purple-500' : 'bg-green-500'
                        } text-white`}>
                          {conversation.type === 'group' ? (
                            <Users className="h-6 w-6" />
                          ) : conversation.type === 'broadcast' ? (
                            <Send className="h-6 w-6" />
                          ) : (
                            <Lock className="h-6 w-6" />
                          )}
                        </div>
                        <div>
                          <span className="font-medium text-lg">{conversation.name}</span>
                          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {conversation.lastMessage && formatPersianDate(conversation.lastMessage.timestamp)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            toggleArchiveConversation(conversation.id);
                            setActiveConversation(conversation.id);
                            setShowArchiveModal(false);
                          }}
                          className={`px-4 py-2 rounded-xl text-sm ${
                            darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600 text-white'
                          }`}
                        >
                          بازگشت از آرشیو
                        </button>
                        <button
                          onClick={() => deleteConversation(conversation.id)}
                          className={`p-2 rounded-xl text-red-500 hover:bg-red-500 hover:bg-opacity-20`}
                          title="حذف گفتگو"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {showPrintModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-8 w-full max-w-4xl shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">چاپ گفتگو</h3>
              <button
                onClick={() => setShowPrintModal(false)}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="mb-6">
              <div className="flex gap-4 mb-4">
                <button
                  onClick={printConversation}
                  className={`px-6 py-3 rounded-xl ${
                    darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  چاپ
                </button>
                <button
                  onClick={saveConversation}
                  className={`px-6 py-3 rounded-xl ${
                    darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  ذخیره به صورت فایل
                </button>
              </div>
              
              <div className={`p-6 rounded-xl max-h-96 overflow-y-auto ${
                darkMode ? 'bg-gray-700' : 'bg-gray-100'
              }`}>
                <div dangerouslySetInnerHTML={{ __html: printContent }} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {activePoll && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-8 w-full max-w-2xl shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">ایجاد نظرسنجی</h3>
              <button
                onClick={() => setActivePoll(null)}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  سوال
                </label>
                <input
                  type="text"
                  value={activePoll.question}
                  onChange={(e) => setActivePoll({
                    ...activePoll,
                    question: e.target.value
                  })}
                  className={`w-full px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                    darkMode 
                      ? 'bg-gray-700 border-gray-600 text-white' 
                      : 'border border-gray-300'
                  }`}
                  placeholder="سوال خود را بنویسید..."
                />
              </div>
              
              <div>
                <label className={`block text-lg font-medium mb-3 ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  گزینه‌ها
                </label>
                <div className="space-y-3">
                  {activePoll.options.map((option, index) => (
                    <div key={option.id} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={option.text}
                        onChange={(e) => {
                          const newOptions = [...activePoll.options];
                          newOptions[index].text = e.target.value;
                          setActivePoll({
                            ...activePoll,
                            options: newOptions
                          });
                        }}
                        className={`flex-1 px-5 py-3 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 text-white' 
                            : 'border border-gray-300'
                        }`}
                        placeholder={`گزینه ${index + 1}`}
                      />
                      {activePoll.options.length > 2 && (
                        <button
                          onClick={() => {
                            const newOptions = activePoll.options.filter((_, i) => i !== index);
                            setActivePoll({
                              ...activePoll,
                              options: newOptions
                            });
                          }}
                          className={`p-3 rounded-xl ${
                            darkMode ? 'text-red-400 hover:bg-gray-700' : 'text-red-500 hover:bg-gray-100'
                          }`}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  
                  {activePoll.options.length < 10 && (
                    <button
                      onClick={() => {
                        setActivePoll({
                          ...activePoll,
                          options: [
                            ...activePoll.options,
                            {
                              id: `opt_${Date.now()}`,
                              text: '',
                              votes: 0,
                              voters: []
                            }
                          ]
                        });
                      }}
                      className={`w-full py-3 rounded-xl text-center ${
                        darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      افزودن گزینه
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <label className={`flex items-center p-3 rounded-xl ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={activePoll.isAnonymous}
                    onChange={(e) => setActivePoll({
                      ...activePoll,
                      isAnonymous: e.target.checked
                    })}
                    className="ml-3 h-5 w-5"
                  />
                  <span className="text-base">نظرسنجی ناشناس</span>
                </label>
                
                <label className={`flex items-center p-3 rounded-xl ${
                  darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}>
                  <input
                    type="checkbox"
                    checked={activePoll.allowsMultipleAnswers}
                    onChange={(e) => setActivePoll({
                      ...activePoll,
                      allowsMultipleAnswers: e.target.checked
                    })}
                    className="ml-3 h-5 w-5"
                  />
                  <span className="text-base">امکان انتخاب چند گزینه</span>
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-4 mt-8">
              <button
                onClick={() => setActivePoll(null)}
                className={`px-6 py-3 rounded-xl text-lg ${
                  darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                انصراف
              </button>
              <button
                onClick={createPoll}
                disabled={!activePoll.question.trim() || activePoll.options.some(o => !o.text.trim())}
                className={`px-6 py-3 rounded-xl text-lg ${
                  !activePoll.question.trim() || activePoll.options.some(o => !o.text.trim())
                    ? 'opacity-50 cursor-not-allowed'
                    : (darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700')
                } text-white`}
              >
                ایجاد نظرسنجی
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showCamera && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className={`rounded-2xl p-6 w-full max-w-2xl shadow-2xl ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          }`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">دوربین</h3>
              <button
                onClick={() => setShowCamera(false)}
                className={`p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="relative">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-96 object-cover rounded-xl bg-black"
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>
              
              <div className="flex justify-center gap-6">
                <button
                  onClick={captureImage}
                  className={`p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors`}
                >
                  <div className="w-6 h-6 rounded-full bg-white"></div>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagingManager;