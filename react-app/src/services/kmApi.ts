import api from './api';
import { KMArticle, KMArticleDetail, KMArticleCreate, KMArticleUpdate, KMCategory, KMTag } from '../types/km';

export const kmApi = {
    // Categories
    getCategories: () => api.get<KMCategory[]>('/km/categories').then(res => res.data),
    createCategory: (data: Partial<KMCategory>) => api.post<KMCategory>('/km/categories', data).then(res => res.data),

    // Tags
    getTags: () => api.get<KMTag[]>('/km/tags').then(res => res.data),

    // Articles
    getArticles: (params?: { skip?: number; limit?: number; category_id?: number; search?: string; tag?: string }) =>
        api.get<KMArticle[]>('/km/articles', { params }).then(res => res.data),

    getArticle: (id: number) => api.get<KMArticleDetail>(`/km/articles/${id}`).then(res => res.data),

    createArticle: (data: KMArticleCreate) => api.post<KMArticle>('/km/articles', data).then(res => res.data),

    updateArticle: (id: number, data: KMArticleUpdate) => api.put<KMArticle>(`/km/articles/${id}`, data).then(res => res.data),

    deleteArticle: (id: number) => api.delete(`/km/articles/${id}`).then(res => res.data),
};
