"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { ShoppingCart, Star, Heart } from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "food", label: "Food" },
  { id: "health", label: "Health & Wellness" },
  { id: "fashion", label: "Fashion" },
  { id: "crafts", label: "Crafts" },
];

interface Product {
  id: string;
  title: string;
  titleEn: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  image: string;
  category: string;
  rating: number;
  reviews: number;
}

const PRODUCTS: Product[] = [
  {
    id: "1",
    title: "프리미엄 고려홍삼",
    titleEn: "Premium Korean Red Ginseng",
    price: 45000,
    originalPrice: 61000,
    discount: 26,
    image: "https://images.unsplash.com/photo-1567922045116-2a00fae2ed03?w=400&h=400&fit=crop",
    category: "health",
    rating: 4.8,
    reviews: 234,
  },
  {
    id: "2",
    title: "전통 김치 선물세트",
    titleEn: "Traditional Kimchi Gift Set",
    price: 38000,
    originalPrice: 46000,
    discount: 18,
    image: "https://images.unsplash.com/photo-1583224994076-0be952070655?w=400&h=400&fit=crop",
    category: "food",
    rating: 4.9,
    reviews: 512,
  },
  {
    id: "3",
    title: "모던 한복 세트",
    titleEn: "Modern Hanbok Set",
    price: 120000,
    originalPrice: 154000,
    discount: 22,
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=400&h=400&fit=crop",
    category: "fashion",
    rating: 4.7,
    reviews: 89,
  },
  {
    id: "4",
    title: "한국 전통 도자기",
    titleEn: "Korean Traditional Pottery",
    price: 85000,
    image: "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400&h=400&fit=crop",
    category: "crafts",
    rating: 4.6,
    reviews: 67,
  },
  {
    id: "5",
    title: "제주 감귤 초콜릿",
    titleEn: "Jeju Tangerine Chocolate",
    price: 18000,
    originalPrice: 24000,
    discount: 25,
    image: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&h=400&fit=crop",
    category: "food",
    rating: 4.5,
    reviews: 321,
  },
  {
    id: "6",
    title: "한방 스킨케어 세트",
    titleEn: "Herbal Skincare Collection",
    price: 67000,
    originalPrice: 89000,
    discount: 25,
    image: "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop",
    category: "health",
    rating: 4.8,
    reviews: 178,
  },
  {
    id: "7",
    title: "프리미엄 한우 선물세트",
    titleEn: "Premium Hanwoo Beef Gift Set",
    price: 150000,
    originalPrice: 190000,
    discount: 21,
    image: "https://images.unsplash.com/photo-1558030006-450675393462?w=400&h=400&fit=crop",
    category: "food",
    rating: 4.9,
    reviews: 156,
  },
  {
    id: "8",
    title: "자개 보석함",
    titleEn: "Mother of Pearl Jewelry Box",
    price: 95000,
    image: "https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=400&h=400&fit=crop",
    category: "crafts",
    rating: 4.7,
    reviews: 43,
  },
];

function formatKrw(n: number): string {
  return "₩" + n.toLocaleString("ko-KR");
}

export default function HomePage() {
  const locale = useLocale();
  const [activeCategory, setActiveCategory] = useState("all");
  const [liked, setLiked] = useState<Set<string>>(new Set());

  const filtered =
    activeCategory === "all"
      ? PRODUCTS
      : PRODUCTS.filter((p) => p.category === activeCategory);

  const toggleLike = (id: string) => {
    setLiked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            한국 특산품 마켓
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Korean Specialty Marketplace
          </p>
        </div>
        <Link
          href={`/${locale}/cart`}
          className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-white">
            0
          </span>
        </Link>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
              activeCategory === cat.id
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((product) => (
          <Link
            key={product.id}
            href={`/${locale}/order`}
            className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-all hover:shadow-xl hover:-translate-y-1"
          >
            {/* Image */}
            <div className="relative aspect-square overflow-hidden bg-slate-100">
              <img
                src={product.image}
                alt={product.title}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              {/* Discount Badge */}
              {product.discount && (
                <div className="absolute left-2.5 top-2.5 rounded-lg bg-brand-accent px-2 py-1 text-xs font-bold text-white shadow-lg">
                  {product.discount}% OFF
                </div>
              )}
              {/* Heart Button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleLike(product.id);
                }}
                className={`absolute right-2.5 top-2.5 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all ${
                  liked.has(product.id)
                    ? "bg-brand-accent text-white"
                    : "bg-white/80 text-slate-400 hover:text-brand-accent"
                }`}
              >
                <Heart
                  className="h-4 w-4"
                  fill={liked.has(product.id) ? "currentColor" : "none"}
                />
              </button>
            </div>

            {/* Info */}
            <div className="flex flex-1 flex-col p-3.5">
              <h3 className="text-sm font-bold text-slate-900 leading-tight">
                {product.title}
              </h3>
              <p className="mt-0.5 text-xs text-slate-400">{product.titleEn}</p>

              {/* Rating */}
              <div className="mt-2 flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span className="text-xs font-semibold text-slate-700">
                  {product.rating}
                </span>
                <span className="text-xs text-slate-400">
                  ({product.reviews})
                </span>
              </div>

              {/* Price */}
              <div className="mt-auto pt-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-base font-black text-slate-900">
                    {formatKrw(product.price)}
                  </span>
                  {product.originalPrice && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatKrw(product.originalPrice)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filtered.length === 0 && (
        <div className="py-20 text-center">
          <p className="text-slate-400 text-lg">
            해당 카테고리에 상품이 없습니다.
          </p>
        </div>
      )}
    </div>
  );
}
