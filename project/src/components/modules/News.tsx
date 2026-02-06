import { useState, useEffect } from 'react';
import { User, News as NewsType } from '../../types';
import api from '../../services/api';
import { SkeletonNewsCard } from '../common/Skeletons';
import EmptyState from '../common/EmptyState';
import { showToast } from '../../utils/toast';

interface NewsProps {
  user: User;
}

interface Reaction {
  id: string;
  news_id: string;
  user_id: string;
  user_name: string;
  reaction_type: string;
  created_at: string;
}

interface Comment {
  id: string;
  news_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  comment_text: string;
  parent_id?: string | null;
  created_at: string;
}

interface ReactionCounts {
  like: number;
  love: number;
  haha: number;
  wow: number;
  sad: number;
  angry: number;
  total: number;
}

function News({ user }: NewsProps) {
  const [news, setNews] = useState<NewsType[]>([]);
  const [loading, setLoading] = useState(true);
  const [reactions, setReactions] = useState<Record<string, { reactions: Reaction[], counts: ReactionCounts }>>({});
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [userReactions, setUserReactions] = useState<Record<string, string>>({});
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [expandedNews, setExpandedNews] = useState<Record<string, boolean>>({});
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({});

  useEffect(() => {
    fetchNews();
  }, []);

  const reactionEmojis: Record<string, { emoji: string; label: string; color: string }> = {
    like: { emoji: '👍', label: 'Me gusta', color: 'text-blue-500' },
    love: { emoji: '❤️', label: 'Me encanta', color: 'text-red-500' },
    haha: { emoji: '😂', label: 'Me divierte', color: 'text-yellow-500' },
    wow: { emoji: '😮', label: 'Me asombra', color: 'text-orange-500' },
    sad: { emoji: '😢', label: 'Me entristece', color: 'text-blue-400' },
    angry: { emoji: '😠', label: 'Me enoja', color: 'text-red-600' }
  };

  const fetchNews = async () => {
    const startTime = Date.now();
    const minLoadingTime = 400;

    try {
      const response = await api.get('/news');
      const newsData = response.data;
      const sortedNews = [...newsData].sort((a: NewsType, b: NewsType) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setNews(sortedNews);

      // Cargar reacciones y comentarios para cada noticia
      sortedNews.forEach((item: NewsType) => {
        fetchReactions(item.id);
        fetchComments(item.id);
      });
    } catch (error) {
      console.error('Error loading news:', error);
      showToast('Error cargando noticias', 'error');
    } finally {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minLoadingTime - elapsed);
      setTimeout(() => setLoading(false), remaining);
    }
  };

  const fetchReactions = async (newsId: string) => {
    try {
      const response = await api.get(`/interactions/reactions/${newsId}`);
      setReactions(prev => ({ ...prev, [newsId]: response.data }));

      // Verificar si el usuario ya reaccionÃ³
      const userReaction = response.data.reactions.find((r: Reaction) => r.user_id === user.id);
      if (userReaction) {
        setUserReactions(prev => ({ ...prev, [newsId]: userReaction.reaction_type }));
      }
    } catch (error) {
      console.error('Error loading reactions:', error);
    }
  };

  const fetchComments = async (newsId: string) => {
    try {
      const response = await api.get(`/interactions/comments/${newsId}`);
      setComments(prev => ({ ...prev, [newsId]: response.data }));
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleReaction = async (newsId: string, reactionType: string) => {
    try {
      const currentReaction = userReactions[newsId];

      if (currentReaction === reactionType) {
        // Remover reacción
        await api.delete('/interactions/reactions', {
          data: { news_id: newsId, user_id: user.id }
        });
        setUserReactions(prev => {
          const newReactions = { ...prev };
          delete newReactions[newsId];
          return newReactions;
        });
      } else {
        // Agregar o cambiar reacción
        await api.post('/interactions/reactions', {
          news_id: newsId,
          user_id: user.id,
          user_name: user.name,
          reaction_type: reactionType
        });
        setUserReactions(prev => ({ ...prev, [newsId]: reactionType }));
      }

      await fetchReactions(newsId);
      setShowReactionPicker(null);
    } catch (error) {
      console.error('Error with reaction:', error);
      showToast('Error procesando reacción', 'error');
    }
  };

  const handleComment = async (newsId: string, parentId: string | null = null) => {
    const text = parentId
      ? replyText[parentId]?.trim()
      : commentText[newsId]?.trim();

    if (!text) return;

    try {
      await api.post('/interactions/comments', {
        news_id: newsId,
        user_id: user.id,
        user_name: user.name,
        user_avatar: user.avatar,
        comment_text: text,
        parent_id: parentId
      });

      if (parentId) {
        setReplyText(prev => ({ ...prev, [parentId]: '' }));
        setReplyingTo(prev => ({ ...prev, [newsId]: null }));
      } else {
        setCommentText(prev => ({ ...prev, [newsId]: '' }));
      }

      await fetchComments(newsId);
      showToast(parentId ? 'Respuesta agregada' : 'Comentario agregado', 'success');
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast('Error agregando comentario', 'error');
    }
  };

  const renderHashtags = (text: string) => {
    const parts = text.split(/(#\w+)/g);
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="text-[#0066CC] font-semibold hover:underline cursor-pointer">
            {part}
          </span>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  const getTopReactions = (newsId: string) => {
    const newsReactions = reactions[newsId]?.counts;
    if (!newsReactions) return [];

    return Object.entries(newsReactions)
      .filter(([key]) => key !== 'total')
      .filter(([_, count]) => count > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([type]) => type);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Main Feed */}
        <div className="flex-1 space-y-6">



          {loading ? (
            <div className="space-y-6">
              {[...Array(3)].map((_, i) => <SkeletonNewsCard key={i} />)}
            </div>
          ) : news.length === 0 ? (
            <EmptyState
              title="No hay noticias publicadas"
              message="Parece que aún no se han publicado noticias. ¡Vuelve pronto!"
              icon="fa-newspaper"
            />
          ) : (
            <div className="space-y-6">
              {news.map((item) => {
                const newsReactions = reactions[item.id];
                const newsComments = comments[item.id] || [];
                const userReaction = userReactions[item.id];
                const topReactions = getTopReactions(item.id);

                return (
                  <div key={item.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors">
                    {/* Header */}
                    <div className="p-6 pb-4">
                      <div className="flex items-center space-x-3 mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-[#0066CC] rounded-full flex items-center justify-center text-white">
                          <i className="fas fa-newspaper"></i>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-bold text-gray-800 dark:text-white">{item.author}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {new Date(item.date).toLocaleDateString('es-DO', {
                              year: 'numeric', month: 'long', day: 'numeric'
                            })}
                          </p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${item.category === 'logros' ? 'bg-green-500' :
                          item.category === 'it' ? 'bg-blue-500' :
                            item.category === 'rrhh' ? 'bg-purple-500' :
                              item.category === 'eventos' ? 'bg-yellow-500' : 'bg-gray-500'
                          }`}>
                          {item.category}
                        </span>
                      </div>

                      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{item.title}</h2>

                      {/* Content with expand/collapse */}
                      <div className="text-gray-700 dark:text-gray-300 mb-4">
                        <p className={`whitespace-pre-wrap ${!expandedNews[item.id] && (item.content || item.excerpt).length > 300
                          ? 'line-clamp-3'
                          : ''
                          }`}>
                          {renderHashtags(item.content || item.excerpt)}
                        </p>

                        {(item.content || item.excerpt).length > 300 && (
                          <button
                            onClick={() => setExpandedNews(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className="text-[#0066CC] font-semibold hover:underline mt-2 text-sm"
                          >
                            {expandedNews[item.id] ? 'Ver menos' : 'Leer más...'}
                          </button>
                        )}
                      </div>

                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full rounded-lg mb-4"
                        />
                      )}
                    </div>

                    {/* Reactions & Comments Count */}
                    {(newsReactions?.counts.total > 0 || newsComments.length > 0) && (
                      <div className="px-6 py-2 border-y border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center space-x-2">
                          {topReactions.length > 0 && (
                            <div className="flex -space-x-1">
                              {topReactions.map(type => (
                                <span key={type} className="text-lg" title={reactionEmojis[type].label}>
                                  {reactionEmojis[type].emoji}
                                </span>
                              ))}
                            </div>
                          )}
                          {newsReactions?.counts.total > 0 && (
                            <span>{newsReactions.counts.total}</span>
                          )}
                        </div>
                        {newsComments.length > 0 && (
                          <button
                            onClick={() => setShowComments(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                            className="hover:underline"
                          >
                            {newsComments.length} comentario{newsComments.length !== 1 ? 's' : ''}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="px-6 py-3 border-b border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2">
                      <div
                        className="relative"
                        onMouseEnter={() => setShowReactionPicker(item.id)}
                        onMouseLeave={() => setShowReactionPicker(null)}
                      >
                        <button
                          className={`w-full py-2 rounded-lg transition font-semibold flex items-center justify-center space-x-2 ${userReaction
                            ? `${reactionEmojis[userReaction].color} bg-opacity-10`
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        >
                          <span className="text-xl">
                            {userReaction ? reactionEmojis[userReaction].emoji : '👍'}
                          </span>
                          <span>{userReaction ? reactionEmojis[userReaction].label : 'Me gusta'}</span>
                        </button>

                        {/* Reaction Picker */}
                        {showReactionPicker === item.id && (
                          <div
                            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white dark:bg-gray-800 rounded-full shadow-2xl border border-gray-100 dark:border-gray-700 px-4 py-2 flex space-x-3 z-20 animate-in fade-in zoom-in-95 duration-200 ring-4 ring-black/5 dark:ring-white/5"
                          >
                            {Object.entries(reactionEmojis).map(([type, { emoji, label }]) => (
                              <button
                                key={type}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleReaction(item.id, type);
                                }}
                                className="text-4xl hover:scale-150 transition-all duration-300 p-1 filter drop-shadow hover:drop-shadow-lg"
                                title={label}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setShowComments(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                        className="py-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition font-semibold flex items-center justify-center space-x-2"
                      >
                        <i className="fas fa-comment"></i>
                        <span>Comentar</span>
                      </button>
                    </div>

                    {showComments[item.id] && (
                      <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
                        {/* Comment Input */}
                        <div className="flex items-start space-x-3 mb-4">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div className="flex-1">
                            <textarea
                              value={commentText[item.id] || ''}
                              onChange={(e) => setCommentText(prev => ({ ...prev, [item.id]: e.target.value }))}
                              placeholder="Escribe un comentario... (usa emojis 😊 y #hashtags)"
                              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                              rows={2}
                            />
                            <div className="flex justify-end mt-2">
                              <button
                                onClick={() => handleComment(item.id)}
                                disabled={!commentText[item.id]?.trim()}
                                className={`px-4 py-2 rounded-lg font-semibold transition ${commentText[item.id]?.trim()
                                  ? 'bg-primary text-white hover:bg-[#009640]'
                                  : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                  }`}
                              >
                                Comentar
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Comments List */}
                        <div className="space-y-4">
                          {newsComments.filter(c => !c.parent_id).map((comment) => (
                            <div key={comment.id} className="space-y-3">
                              {/* Main Comment */}
                              <div className="flex items-start space-x-3">
                                <img
                                  src={comment.user_avatar}
                                  alt={comment.user_name}
                                  className="w-10 h-10 rounded-full"
                                />
                                <div className="flex-1">
                                  <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm border border-gray-100 dark:border-gray-700">
                                    <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">{comment.user_name}</p>
                                    <p className="text-gray-700 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                                      {renderHashtags(comment.comment_text)}
                                    </p>
                                  </div>
                                  <div className="flex items-center space-x-4 mt-1 ml-1">
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                      {new Date(comment.created_at).toLocaleString('es-DO', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                    <button
                                      onClick={() => setReplyingTo(prev => ({ ...prev, [comment.id]: prev[comment.id] ? null : comment.id }))}
                                      className="text-xs font-semibold text-gray-500 hover:text-primary transition"
                                    >
                                      Responder
                                    </button>
                                  </div>

                                  {/* Reply Input */}
                                  {replyingTo[comment.id] === comment.id && (
                                    <div className="mt-2 flex items-start space-x-2 animate-in fade-in slide-in-from-top-1">
                                      <img
                                        src={user.avatar}
                                        alt={user.name}
                                        className="w-8 h-8 rounded-full"
                                      />
                                      <div className="flex-1">
                                        <textarea
                                          value={replyText[comment.id] || ''}
                                          onChange={(e) => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                                          placeholder={`Respondiendo a ${comment.user_name}...`}
                                          className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                                          rows={1}
                                        />
                                        <div className="flex justify-end mt-2 space-x-2">
                                          <button
                                            onClick={() => setReplyingTo(prev => ({ ...prev, [comment.id]: null }))}
                                            className="text-xs text-gray-500 hover:text-gray-700"
                                          >
                                            Cancelar
                                          </button>
                                          <button
                                            onClick={() => handleComment(item.id, comment.id)}
                                            disabled={!replyText[comment.id]?.trim()}
                                            className="px-3 py-1 bg-primary text-white text-xs rounded-md hover:bg-[#009640] disabled:opacity-50"
                                          >
                                            Responder
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Replies List */}
                                  {newsComments.filter(r => r.parent_id === comment.id).length > 0 && (
                                    <div className="mt-3 space-y-3 pl-4 border-l-2 border-gray-100 dark:border-gray-700">
                                      {newsComments.filter(r => r.parent_id === comment.id).map(reply => (
                                        <div key={reply.id} className="flex items-start space-x-3">
                                          <img
                                            src={reply.user_avatar}
                                            alt={reply.user_name}
                                            className="w-8 h-8 rounded-full"
                                          />
                                          <div className="flex-1">
                                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-3 py-2">
                                              <p className="font-semibold text-gray-800 dark:text-gray-200 text-xs">{reply.user_name}</p>
                                              <p className="text-gray-700 dark:text-gray-300 mt-1 text-sm whitespace-pre-wrap">
                                                {renderHashtags(reply.comment_text)}
                                              </p>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-1">
                                              {new Date(reply.created_at).toLocaleString('es-DO', {
                                                month: 'short',
                                                day: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                              })}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar - Trending/Top Reactions */}
        <div className="hidden lg:block w-80 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 sticky top-6">
            <h3 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center">
              <i className="fas fa-fire text-orange-500 mr-2"></i>
              Destacados
            </h3>
            <div className="space-y-4">
              {news.slice(0, 3).map(item => (
                <div key={item.id} className="group cursor-pointer">
                  <p className="text-xs text-primary font-bold uppercase mb-1">{item.category}</p>
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200 group-hover:text-primary transition-colors line-clamp-2">
                    {item.title}
                  </h4>
                  <div className="flex items-center mt-2 text-[10px] text-gray-500">
                    <span className="flex items-center mr-3">
                      <i className="fas fa-heart text-red-500 mr-1"></i>
                      {reactions[item.id]?.counts.total || 0}
                    </span>
                    <span className="flex items-center">
                      <i className="fas fa-comment text-blue-500 mr-1"></i>
                      {comments[item.id]?.length || 0}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default News;
