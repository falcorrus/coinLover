import fs from 'fs';
import path from 'path';

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src');
let changedCount = 0;

for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Mapping old Tailwind classes to nice CSS variables
    const replacements = [
        // Backgrounds
        ['bg-[#050505]', 'bg-(--bg-main)'],
        ['bg-[#111]', 'bg-(--bg-sub)'],
        ['bg-[#121212]', 'bg-(--bg-panel)'],
        ['bg-[#1a1a1a]', 'bg-(--bg-card)'],
        ['bg-[#1e1e1e]', 'bg-(--bg-card-alt)'],
        ['bg-[#2a2a2a]', 'bg-(--bg-border)'],
        ['bg-[#333]', 'bg-(--bg-border-strong)'],

        // Generic Overlays / Borders in Dark Mode
        ['bg-white/5', 'bg-(--overlay)'],
        ['bg-white/10', 'bg-(--overlay-strong)'],
        ['bg-white/20', 'bg-(--overlay-glow)'],
        ['border-white/5', 'border-(--border-sub)'],
        ['border-white/10', 'border-(--border-main)'],
        ['border-white/20', 'border-(--border-strong)'],
        ['border-white', 'border-(--text-main)'],

        // Text colors
        ['text-white', 'text-(--text-main)'],
        ['text-slate-300', 'text-(--text-muted)'],
        ['text-slate-400', 'text-(--text-muted)'],
        ['text-slate-500', 'text-(--text-sub)'],
        ['text-slate-600', 'text-(--text-sub)'],

        ['bg-black/80', 'bg-(--backdrop-main)'],
        ['bg-black/94', 'bg-(--backdrop-strong)'],

        ['bg-white/\\[0.01\\]', 'bg-(--overlay-1)'],
        ['bg-white/\\[0.02\\]', 'bg-(--overlay-2)'],
        ['bg-white/\\[0.04\\]', 'bg-(--overlay-4)'],
        ['bg-white/\\[0.07\\]', 'bg-(--overlay-7)'],
        ['bg-white/\\[0.1\\]', 'bg-(--overlay-10)'],

        ['shadow-[0_0_15px_rgba(109,93,252,0.5)]', 'shadow-primary'],
        ['shadow-[0_0_10px_rgba(109,93,252,0.15)]', 'shadow-primary-sm'],

        ['border-[#050505]', 'border-(--bg-main)'],
    ];

    for (const [oldClass, newClass] of replacements) {
        // Escape brackets for regex
        const escapedOld = oldClass.replace(/[\[\]\/().]/g, '\\$&');
        content = content.replace(new RegExp(`\\b${escapedOld}\\b`, 'g'), newClass);
    }

    // Handle specific edge cases where word boundaries might fail
    content = content.replace(/bg-white\/5/g, 'bg-(--overlay)');
    content = content.replace(/bg-white\/10/g, 'bg-(--overlay-strong)');
    content = content.replace(/border-white\/5/g, 'border-(--border-sub)');
    content = content.replace(/border-white\/10/g, 'border-(--border-main)');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        changedCount++;
    }
}

console.log(`${changedCount} files updated.`);
