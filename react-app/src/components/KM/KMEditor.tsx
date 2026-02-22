import React, { useState, useEffect } from 'react';
import { KMCategory } from '../../types/km';
import { kmApi } from '../../services/kmApi';
import { Save, X, Plus, Trash2 } from 'lucide-react';

interface KMEditorProps {
    articleId: number | null;
    categories: KMCategory[];
    onBack: () => void;
}

const KMEditor: React.FC<KMEditorProps> = ({ articleId, categories, onBack }) => {
    const [title, setTitle] = useState('');
    const [contentMd, setContentMd] = useState('');
    const [categoryId, setCategoryId] = useState<number | ''>('');
    const [status, setStatus] = useState('Draft');
    const [tags, setTags] = useState<string[]>([]);
    const [tagInput, setTagInput] = useState('');
    const [relations, setRelations] = useState<{ target_module: string, target_id: string }[]>([]);
    const [relModule, setRelModule] = useState('NCR');
    const [relId, setRelId] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (articleId) {
            setLoading(true);
            kmApi.getArticle(articleId).then(article => {
                setTitle(article.title);
                setContentMd(article.content_md);
                setCategoryId(article.category_id || '');
                setStatus(article.status);
                setTags(article.tags.map(t => t.name));
                setRelations(article.relations.map(r => ({ target_module: r.target_module, target_id: r.target_id })));
            }).finally(() => setLoading(false));
        }
    }, [articleId]);

    const handleSave = async () => {
        if (!title.trim() || !contentMd.trim()) {
            alert('請填寫標題與內容');
            return;
        }

        setSaving(true);
        try {
            const data = {
                title,
                content_md: contentMd,
                category_id: categoryId === '' ? undefined : categoryId,
                status,
                tags,
                relations
            };

            if (articleId) {
                await kmApi.updateArticle(articleId, data);
            } else {
                await kmApi.createArticle(data);
            }
            onBack();
        } catch (e) {
            console.error(e);
            alert('儲存失敗');
        } finally {
            setSaving(false);
        }
    };

    const addTag = () => {
        if (tagInput.trim() && !tags.includes(tagInput.trim())) {
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (t: string) => {
        setTags(tags.filter(tag => tag !== t));
    };

    const addRelation = () => {
        if (relId.trim()) {
            setRelations([...relations, { target_module: relModule, target_id: relId.trim() }]);
            setRelId('');
        }
    };

    const removeRelation = (idx: number) => {
        setRelations(relations.filter((_, i) => i !== idx));
    };

    if (loading) return <div className="p-8 text-center text-slate-500">載入中...</div>;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 min-h-full flex flex-col">
            <div className="border-b border-slate-200 p-6 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
                <h2 className="text-xl font-bold text-slate-800">
                    {articleId ? '編輯知識庫文章' : '新增知識庫文章'}
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={onBack}
                        className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm bg-white"
                    >
                        <X className="w-4 h-4" /> 取消
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-medium transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" /> {saving ? '儲存中...' : '儲存文章'}
                    </button>
                </div>
            </div>

            <div className="flex flex-1 p-6 gap-8">
                {/* Left Form */}
                <div className="flex-1 space-y-6 flex flex-col">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">標題</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 focus:bg-white transition-all text-slate-800 font-medium placeholder:text-slate-400"
                            placeholder="輸入文章標題..."
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 flex flex-col min-h-[400px]">
                        <label className="block text-sm font-semibold text-slate-700 mb-2 flex justify-between">
                            <span>內容 (支援 Markdown 格式)</span>
                        </label>
                        <textarea
                            className="flex-1 w-full px-4 py-3 bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 hover:border-blue-300 focus:bg-white transition-all font-mono text-sm leading-relaxed resize-none placeholder:text-slate-400 placeholder:opacity-75 shadow-inner"
                            placeholder="# 標題 1\n\n- 列表項目\n- 項目 2\n\n**粗體文字**"
                            value={contentMd}
                            onChange={e => setContentMd(e.target.value)}
                        />
                    </div>
                </div>

                {/* Right Settings */}
                <div className="w-80 space-y-8 bg-slate-50/50 p-6 rounded-xl border border-slate-200 h-fit shadow-sm">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">分類</label>
                        <select
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium text-slate-700 shadow-sm"
                            value={categoryId}
                            onChange={e => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                        >
                            <option value="">選擇分類...</option>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="pt-6 border-t border-slate-200">
                        <label className="block text-sm font-semibold text-slate-700 mb-3">狀態</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setStatus('Draft')}
                                className={`py-2 px-3 text-sm font-bold rounded-lg border transition-all ${status === 'Draft' ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-sm ring-1 ring-amber-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'}`}
                            >
                                草稿
                            </button>
                            <button
                                onClick={() => setStatus('Published')}
                                className={`py-2 px-3 text-sm font-bold rounded-lg border transition-all ${status === 'Published' ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm ring-1 ring-emerald-100' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'}`}
                            >
                                已發布
                            </button>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">標籤</label>
                        <div className="flex gap-2 mb-3">
                            <input
                                type="text"
                                className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm transition-all placeholder:text-slate-400"
                                placeholder="新增標籤"
                                value={tagInput}
                                onChange={e => setTagInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addTag()}
                            />
                            <button onClick={addTag} className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 border border-indigo-100 shadow-sm rounded-lg transition-colors">
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-wrap gap-2">
                            {tags.map(t => (
                                <span key={t} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-indigo-100 text-indigo-700 rounded-lg text-xs font-bold shadow-sm">
                                    {t}
                                    <button onClick={() => removeTag(t)} className="text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded p-0.5 transition-colors">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">關聯單據</label>
                        <div className="space-y-3 mb-4">
                            <div className="flex gap-2">
                                <select
                                    className="w-24 px-2 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-medium text-slate-700 shadow-sm"
                                    value={relModule}
                                    onChange={e => setRelModule(e.target.value)}
                                >
                                    <option value="NCR">NCR</option>
                                    <option value="ITR">ITR</option>
                                    <option value="OBS">OBS</option>
                                    <option value="ITP">ITP</option>
                                </select>
                                <input
                                    type="text"
                                    className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all placeholder:text-slate-400"
                                    placeholder="單號..."
                                    value={relId}
                                    onChange={e => setRelId(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addRelation()}
                                />
                                <button onClick={addRelation} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100 shadow-sm rounded-lg transition-colors">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {relations.map((rel, idx) => (
                                <div key={idx} className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg shadow-sm group hover:border-blue-200 transition-all">
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase px-1.5 py-0.5 bg-slate-100 rounded">{rel.target_module}</span>
                                        <span className="text-sm font-bold text-slate-700">{rel.target_id}</span>
                                    </div>
                                    <button onClick={() => removeRelation(idx)} className="text-red-400 hover:text-red-600 transition-colors bg-white hover:bg-red-50 p-1.5 rounded-md opacity-0 group-hover:opacity-100">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KMEditor;
