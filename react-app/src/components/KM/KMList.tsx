import React, { useState } from 'react';
import { KMArticle, KMCategory, KMTag } from '../../types/km';
import { FileText, Folder, Tag as TagIcon, Clock, User, ChevronRight } from 'lucide-react';

interface KMListProps {
    articles: KMArticle[];
    categories: KMCategory[];
    tags: KMTag[];
    loading: boolean;
    onSelectArticle: (id: number) => void;
}

const KMList: React.FC<KMListProps> = ({ articles, categories, tags, loading, onSelectArticle }) => {
    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const filteredArticles = articles.filter(a => {
        if (selectedCategory && a.category_id !== selectedCategory) return false;
        if (selectedTag && !a.tags.some(t => t.name === selectedTag)) return false;
        return true;
    });

    return (
        <div className="flex bg-white rounded-xl shadow-sm border border-slate-200 h-full overflow-hidden">
            {/* Sidebar: Categories & Tags */}
            <div className="w-64 flex-none border-r border-slate-200 bg-slate-50/50 p-4 overflow-y-auto">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">分類</h3>
                <div className="space-y-1 mb-8">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === null
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            }`}
                    >
                        <Folder className="w-4 h-4" />
                        <span>所有分類</span>
                    </button>

                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === cat.id
                                    ? 'bg-blue-50 text-blue-700 font-medium'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                        >
                            <Folder className="w-4 h-4" />
                            <span>{cat.name}</span>
                        </button>
                    ))}
                </div>

                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">標籤</h3>
                <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
                        <button
                            key={tag.id}
                            onClick={() => setSelectedTag(selectedTag === tag.name ? null : tag.name)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${selectedTag === tag.name
                                    ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                        >
                            <TagIcon className="w-3 h-3" />
                            {tag.name}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main List */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-slate-400">載入中...</div>
                ) : filteredArticles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                        <div className="p-4 bg-slate-100 rounded-full">
                            <FileText className="w-8 h-8 text-slate-300" />
                        </div>
                        <p>找不到符合條件的文章</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredArticles.map(article => (
                            <div
                                key={article.id}
                                onClick={() => onSelectArticle(article.id)}
                                className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex flex-col h-full"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className={`px-2.5 py-1 rounded-md text-xs font-medium border ${article.status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            article.status === 'Draft' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                'bg-slate-100 text-slate-700 border-slate-200'
                                        }`}>
                                        {article.status === 'Published' ? '已發布' : article.status === 'Draft' ? '草稿' : '封存'}
                                    </div>
                                    {article.category && (
                                        <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
                                            <Folder className="w-3 h-3" />
                                            {article.category.name}
                                        </span>
                                    )}
                                </div>

                                <h3 className="font-bold text-slate-800 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                    {article.title}
                                </h3>

                                <p className="text-sm text-slate-500 line-clamp-3 mb-6 flex-1 text-justify leading-relaxed">
                                    {article.content_md.replace(/[*_#`~>]/g, '')}
                                </p>

                                <div className="mt-auto pt-4 border-t border-slate-100 space-y-4">
                                    <div className="flex flex-wrap gap-1.5">
                                        {article.tags.map(t => (
                                            <span key={t.id} className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-slate-50 border border-slate-200 text-slate-500 rounded-full">
                                                {t.name}
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5" />
                                                <span>{article.created_by || '系統'}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5" />
                                                <span>v{article.version}</span>
                                            </div>
                                        </div>

                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transform group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default KMList;
