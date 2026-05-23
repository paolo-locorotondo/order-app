"use client";

import React from "react";

interface AdminModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export default function AdminModal({ isOpen, onClose, title, children }: AdminModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
            <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl sm:max-w-lg lg:max-w-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 p-4 sm:p-6">
                    <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">{title}</h2>
                    <button
                        onClick={onClose}
                        aria-label="Chiudi"
                        className="text-slate-400 hover:text-slate-600"
                    >
                        ✕
                    </button>
                </div>
                <div className="p-4 sm:p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
