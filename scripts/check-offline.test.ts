import { expect, test } from 'vitest';
import { findExternalAssets } from './check-offline.js';

test('flags an external stylesheet', () => {
  const html = '<link rel="stylesheet" href="https://fonts.googleapis.com/css?x">';
  expect(findExternalAssets(html)).toContain('https://fonts.googleapis.com/css?x');
});

test('flags an external script', () => {
  expect(findExternalAssets('<script src="https://cdn.jsdelivr.net/x.js"></script>'))
    .toHaveLength(1);
});

test('flags an external image', () => {
  expect(findExternalAssets('<img src="https://example.com/a.png">')).toHaveLength(1);
});

test('flags an external url() in inline CSS', () => {
  expect(findExternalAssets('<style>@font-face{src:url(https://x.com/f.woff2)}</style>'))
    .toHaveLength(1);
});

test('IGNORES an external prose link — LeetCode links are required', () => {
  const html = '<p>Practise on <a href="https://leetcode.com/problems/two-sum/">LeetCode</a>.</p>';
  expect(findExternalAssets(html)).toEqual([]);
});

test('ignores local asset paths', () => {
  const html = '<link rel="stylesheet" href="/_astro/index.css"><img src="/img/a.png">';
  expect(findExternalAssets(html)).toEqual([]);
});

test('ignores protocol-relative local paths and data URIs', () => {
  expect(findExternalAssets('<img src="data:image/png;base64,AAA">')).toEqual([]);
});

test('flags every external srcset candidate', () => {
  const html = '<img srcset="https://a.com/1.png 1x, https://a.com/2.png 2x">';
  expect(findExternalAssets(html)).toHaveLength(2);
});
