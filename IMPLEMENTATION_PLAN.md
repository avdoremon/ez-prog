# CS Learning Platform — Implementation Plan

> Trang web học dành cho kỹ sư máy tính cơ bản, lấy **visualization tương tác** làm trung tâm.
> Phiên bản 1.0 — 2026-08-19

---

## 0. Quyết định đã chốt

| Hạng mục | Quyết định | Hệ quả kiến trúc |
|---|---|---|
| Ngôn ngữ nội dung | **English only** | Không bật i18n ở Phase 1, nhưng vẫn giữ cấu trúc thư mục `src/content/docs/en/` để mở rộng sau |
| Backend ứng dụng | **Không có** — static thuần | Không auth, không DB. Tiến độ lưu trong IndexedDB của trình duyệt |
| Chạy code | **Đầy đủ**: browser runtime + Judge0 chấm bài | Judge0 là *service hạ tầng*, không phải app backend. Cần 1 reverse proxy mỏng đứng trước nó |
| Visualization | SVG / Canvas / DOM — **không dùng video** | Bắt buộc có viz engine tái sử dụng |
| Môi trường | Offline trước → deploy server thật | Toàn bộ asset self-host, không phụ thuộc CDN |

### 0.1. Một điểm cần thống nhất trước khi bắt đầu

"Static thuần" + "Judge0 chấm bài" là hai yêu cầu **hơi mâu thuẫn nhau** ở một điểm: khi không có backend, toàn bộ testcase và đáp án mong đợi phải nằm trong bundle gửi xuống trình duyệt — người học có thể mở DevTools và đọc được.

Phương án xử lý ở Phase 1 (chấp nhận được vì đây là site học, không phải site thi):

- **Sample testcases**: để nguyên văn, hiển thị công khai cho người học debug.
- **Hidden testcases**: chỉ ship `sha256(normalize(expected_output))`, không ship đáp án thô. Client chạy Judge0 → hash stdout → so sánh hash. Người học không đọc được đáp án, nhưng vẫn có thể brute-force nếu output không gian nhỏ.
- Bài toán "chống gian lận thật sự" **hoãn sang Phase 5** khi có backend.

Đây là trade-off có ý thức, không phải thiếu sót — cần ghi vào README để về sau không ai hiểu nhầm.

---

## 1. Kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│                                                             │
│  ┌───────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ Static pages  │  │ Viz Engine   │  │  Code Runner     │  │
│  │ (Astro/HTML)  │  │ (React isl.) │  │  ┌─────────────┐ │  │
│  │ zero JS       │  │ step-frame   │  │  │ Web Worker  │ │  │
│  └───────────────┘  │ player       │  │  │ (JS/TS)     │ │  │
│                     └──────────────┘  │  ├─────────────┤ │  │
│  ┌───────────────┐  ┌──────────────┐  │  │ Pyodide     │ │  │
│  │ Pagefind      │  │ IndexedDB    │  │  │ (Python)    │ │  │
│  │ (search)      │  │ (progress)   │  │  └─────────────┘ │  │
│  └───────────────┘  └──────────────┘  └────────┬─────────┘  │
└────────────────────────────────────────────────┼────────────┘
                                                 │ POST /api/judge/*
                                                 ▼
                              ┌──────────────────────────────┐
                              │  nginx (reverse proxy)       │
                              │  - inject X-Auth-Token       │
                              │  - rate limit                │
                              │  - CORS                      │
                              └──────────────┬───────────────┘
                                             ▼
                              ┌──────────────────────────────┐
                              │  Judge0 CE (docker)          │
                              │  server + workers            │
                              │  + PostgreSQL + Redis        │
                              │  ⚠ privileged container      │
                              └──────────────────────────────┘
```

**Nguyên tắc phân tách:**
1. Web tĩnh và Judge0 là **hai deployable độc lập**. Web sập không ảnh hưởng Judge0 và ngược lại.
2. Trình duyệt **không bao giờ** gọi thẳng Judge0 — luôn qua nginx. Auth token của Judge0 không được lộ ra client.
3. Mọi thứ chạy được offline bằng một lệnh `docker compose up`.

---

## 2. Tech stack

### 2.1. Chốt version

| Layer | Lựa chọn | Version | Ghi chú |
|---|---|---|---|
| Framework | Astro | 7.x | Bắt buộc, do Starlight 0.41+ đã bỏ hỗ trợ Astro 6 |
| Docs theme | @astrojs/starlight | 0.41.x | Sidebar, TOC, dark mode, frontmatter validation |
| Search | Pagefind | (đi kèm Starlight) | Index tĩnh, chạy trong browser, không cần service ngoài |
| UI islands | React | 19.x | Chỉ dùng cho viz + code runner |
| Styling | Tailwind CSS | 4.x | Qua `@tailwindcss/vite` |
| Animation | Motion (framer-motion) | 12.x | Chỉ cho viz, tôn trọng `prefers-reduced-motion` |
| Code editor | CodeMirror 6 | 6.x | Nhẹ hơn Monaco ~10x, đủ dùng cho bài học |
| Syntax highlight | Shiki (qua Expressive Code) | đi kèm Starlight | Build-time, zero JS runtime |
| Diagram tĩnh | Mermaid (rehype, build-time → SVG) | 11.x | Class/sequence/state diagram |
| Diagram tương tác | React Flow (`@xyflow/react`) | 12.x | DevOps, CI/CD, Architecture, Career Path |
| Terminal | xterm.js | 5.x | Bài học Linux/Unix/Windows |
| Chart | Recharts | 3.x | Biểu đồ độ phức tạp, benchmark |
| Python in browser | Pyodide | 0.28+ | Self-host asset, không dùng CDN |
| Judge chấm bài | Judge0 CE | 1.13.x | Docker Compose |
| Local storage | `idb-keyval` | 6.x | Wrapper mỏng cho IndexedDB |
| Test | Vitest + Playwright + axe-core | | |
| Package manager | pnpm workspaces | 9.x | |

### 2.2. Lý do chọn Astro + Starlight (chứ không phải Next.js/Docusaurus)

- Islands architecture: bài học chữ ship **0 KB JS**, chỉ component viz mới hydrate → tốc độ đọc rất tốt.
- Sidebar tự sinh từ cây thư mục + `order` trong frontmatter → khớp trực tiếp yêu cầu "thứ tự ưu tiên từ trên xuống".
- Frontmatter validate bằng Zod tại build time → có thể **fail build** nếu bài học thiếu viz hoặc quá dài (xem §5.3).
- Output tĩnh 100% → offline dev và deploy production dùng chung một artifact.
- Framework-agnostic: nếu sau này muốn viết viz bằng Svelte cho nhẹ hơn, không phải đổi framework.

**Rủi ro đã biết:** Starlight còn ở `0.x`, minor version có breaking change. → Khóa version chính xác trong `package.json` (không dùng `^`), nâng cấp có chủ đích bằng `npx @astrojs/upgrade`.

---

## 3. Cấu trúc repository

```
cs-learning-platform/
├── apps/
│   └── web/                        # Astro + Starlight
│       ├── astro.config.mjs
│       ├── src/
│       │   ├── content/
│       │   │   ├── docs/           # Bài học (MDX)
│       │   │   └── config.ts       # Zod schema
│       │   ├── components/         # .astro wrappers
│       │   ├── styles/
│       │   │   └── tokens.css      # Design tokens
│       │   └── lib/
│       │       ├── progress.ts     # IndexedDB
│       │       └── judge.ts        # Judge0 client
│       └── public/
│           └── pyodide/            # Self-hosted Pyodide assets
│
├── packages/
│   ├── viz-core/                   # ⭐ Engine step-frame (framework-agnostic)
│   │   ├── src/types.ts
│   │   ├── src/player.ts
│   │   └── src/algorithms/         # Generators
│   ├── viz-react/                  # Renderers React
│   │   └── src/renderers/          # ArrayView, TreeView, GraphView, ...
│   ├── runner/                     # Browser runtime (Worker, Pyodide)
│   └── ui/                         # Design system dùng chung
│
├── content-problems/               # Đề bài + testcase (JSON, nguồn sự thật)
│   └── arrays/two-sum/
│       ├── problem.yaml
│       ├── tests/sample.json
│       ├── tests/hidden.json       # bị hash lúc build
│       └── starters/{c,cpp,java,py,js}.txt
│
├── infra/
│   ├── docker-compose.dev.yml      # web dev + judge0 (offline)
│   ├── docker-compose.prod.yml     # judge0 stack cho server thật
│   ├── nginx/
│   │   ├── site.conf               # serve static + proxy /api/judge
│   │   └── judge0-proxy.conf
│   └── judge0/judge0.conf
│
├── scripts/
│   ├── build-problems.ts           # YAML → JSON, hash hidden testcases
│   ├── lint-content.ts             # Kiểm tra DoD của bài học
│   └── map-judge0-languages.ts     # Lấy language_id động từ Judge0
│
└── docs/
    ├── AUTHORING.md                # Hướng dẫn viết bài học
    └── VIZ_COOKBOOK.md             # Cách viết một generator mới
```

**Nguyên tắc:** `viz-core` **không import React**. Nó chỉ sinh ra dữ liệu frame. Việc này cho phép test bằng Vitest thuần, và sau này đổi renderer mà không đụng thuật toán.

---

## 4. Visualization Engine — thiết kế chi tiết

Đây là phần quan trọng nhất. Nếu làm đúng, mỗi bài học mới chỉ tốn ~20 dòng code viz. Nếu làm sai, đến bài thứ 50 sẽ phải viết lại từ đầu.

### 4.1. Mô hình dữ liệu

```ts
// packages/viz-core/src/types.ts

/** Một khung hình = trạng thái tại một bước của thuật toán */
export interface Frame<S = unknown> {
  /** Snapshot bất biến của dữ liệu tại bước này */
  state: S;
  /** Các phần tử cần làm nổi bật, theo ngữ nghĩa */
  marks?: Mark[];
  /** Giải thích 1 câu, hiển thị dưới player. BẮT BUỘC. */
  note: string;
  /** Dòng code tương ứng đang được thực thi (để highlight song song) */
  line?: number;
  /** Biến cục bộ cần hiển thị: { i: 3, j: 5, pivot: 42 } */
  vars?: Record<string, string | number>;
}

export type MarkKind =
  | 'cursor'     // con trỏ đang xét
  | 'compare'    // đang so sánh
  | 'swap'       // vừa hoán đổi
  | 'done'       // đã ở vị trí đúng
  | 'visited'    // đã duyệt qua
  | 'active'     // vùng đang xử lý
  | 'discard';   // bị loại bỏ

export interface Mark { kind: MarkKind; at: number | string | [number, number]; }

/** Thuật toán = hàm generator sinh ra chuỗi frame */
export type VizAlgorithm<I, S> = (input: I) => Generator<Frame<S>>;
```

### 4.2. Ví dụ một thuật toán

```ts
// packages/viz-core/src/algorithms/binary-search.ts
export const binarySearch: VizAlgorithm<{ arr: number[]; target: number }, number[]> =
function* ({ arr, target }) {
  let lo = 0, hi = arr.length - 1;
  yield { state: arr, note: `Searching for ${target} in a sorted array.`, line: 1,
          vars: { lo, hi } };

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    yield {
      state: arr, line: 4, vars: { lo, hi, mid },
      marks: [{ kind: 'active', at: [lo, hi] }, { kind: 'cursor', at: mid }],
      note: `Midpoint is index ${mid} (value ${arr[mid]}).`,
    };

    if (arr[mid] === target) {
      yield { state: arr, line: 5, marks: [{ kind: 'done', at: mid }],
              note: `Found the target at index ${mid}.` };
      return;
    }
    if (arr[mid] < target) {
      yield { state: arr, line: 6, marks: [{ kind: 'discard', at: [lo, mid] }],
              note: `Value is too small — discard the left half.` };
      lo = mid + 1;
    } else {
      yield { state: arr, line: 8, marks: [{ kind: 'discard', at: [mid, hi] }],
              note: `Value is too large — discard the right half.` };
      hi = mid - 1;
    }
  }
  yield { state: arr, note: `Search space is empty. The target is not present.` };
};
```

Nhìn vào ví dụ này: **thuật toán vẫn đọc y hệt pseudo-code trong sách giáo khoa**. Đó chính là mục tiêu — người viết bài học không phải học API vẽ đồ họa.

### 4.3. Player

Một component duy nhất, dùng cho **mọi** bài học:

- Controls: `⏮ ◀ ▶/⏸ ▶ ⏭` + thanh scrub + chọn tốc độ (0.5× / 1× / 2× / 4×)
- Phím tắt: `Space` play/pause, `←/→` step, `Home/End`, `R` reset
- Panel bên phải: bảng biến (`vars`) + `note` của frame hiện tại
- Panel bên trái (tùy chọn): code với dòng `line` đang sáng
- Ô input: cho phép người học **tự nhập dữ liệu** rồi chạy lại → đây là thứ video không làm được, và là lý do chính để không dùng video
- Tôn trọng `prefers-reduced-motion`: tắt animation, chỉ nhảy frame
- Có nút "Copy as GIF-less permalink": encode input vào URL để chia sẻ

### 4.4. Renderers

| Renderer | Dùng cho |
|---|---|
| `ArrayView` | sorting, searching, two-pointer, sliding window, DP 1D |
| `Matrix2DView` | DP 2D, grid BFS/DFS, image processing |
| `LinkedListView` | linked list, LRU cache |
| `TreeView` | BST, heap, trie, segment tree, AVL rotation |
| `GraphView` | BFS/DFS, Dijkstra, MST, topological sort |
| `StackFrameView` | đệ quy, call stack, backtracking |
| `MemoryView` | con trỏ C, stack vs heap, tham chiếu Java |
| `FlowView` (React Flow) | CI/CD pipeline, kiến trúc hệ thống, career path |
| `TerminalView` (xterm.js) | Linux/Unix/Windows shell |
| `MermaidBlock` | class diagram, sequence diagram (build-time SVG) |

**Quy tắc:** không tạo renderer thứ 11 nếu chưa có ít nhất **3 bài học** cần đến nó.

### 4.5. Registry và cách dùng trong MDX

```ts
// apps/web/src/viz/registry.ts
export const VIZ = {
  'binary-search': {
    algorithm: binarySearch,
    renderer: 'ArrayView',
    defaultInput: { arr: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91], target: 23 },
    inputSchema: z.object({ arr: z.array(z.number()), target: z.number() }),
    code: { js: '...', c: '...', java: '...' },
  },
  // ...
} satisfies Record<string, VizEntry>;
```

Trong bài học:

```mdx
---
title: Binary Search
order: 210
viz: binary-search
estimatedMinutes: 6
---

Binary search finds a value in a **sorted** array by repeatedly halving
the search space.

<Viz id="binary-search" />

Each step throws away half of what's left, so the number of steps grows
with `log₂ n`, not `n`.
```

### 4.6. Test cho viz

Đây là chỗ dễ bị bỏ qua nhưng cực kỳ đáng làm — property-based test:

```ts
test('every sorting algorithm ends with a sorted array', () => {
  fc.assert(fc.property(fc.array(fc.integer()), (arr) => {
    const frames = [...bubbleSort({ arr: [...arr] })];
    expect(frames.at(-1)!.state).toEqual([...arr].sort((a,b) => a-b));
  }));
});

test('every frame has a non-empty note', () => { /* ... */ });
test('frame count is bounded', () => { /* tránh vô hạn */ });
```

---

## 5. Content model

### 5.1. Cây nội dung và thứ tự ưu tiên

`order` dùng bước nhảy 10 để chèn bài mới về sau không phải đánh số lại.

```
100  Programming
  200  Data Structures & Algorithms
    210  Data Structures
    220  Algorithms
    230  Practice Problems
  300  Programming Languages
    310  C
    320  C++
    330  Java
    340  (Python / Go / ... — Phase sau)
  400  Design Patterns
  500  DevOps
  600  CI/CD
  700  Full Stack Development
  800  Solution Architecture
  900  Career Path

1000 Systems
  1010  Linux
  1020  Unix
  1030  Windows
```

Trong `astro.config.mjs`, sidebar dùng `autogenerate` theo thư mục, thứ tự lấy từ `sidebar.order` của từng file.

### 5.2. Cấu trúc một bài học

```
Lesson (5–10 phút)
├── Hook          1–2 câu: bài này giải quyết vấn đề gì
├── Concept       ≤ 300 từ
├── Visualization BẮT BUỘC — 1 viz tương tác
├── Example       code chạy được, ≤ 30 dòng
├── Trade-offs    khi nào dùng / khi nào không
├── Quiz          2–3 câu trắc nghiệm
└── Practice      link tới 1 problem (nếu có)
```

### 5.3. Frontmatter schema (ép kỷ luật bằng build)

```ts
// apps/web/src/content/config.ts
const lessonSchema = z.object({
  title: z.string().max(60),
  description: z.string().min(20).max(160),
  order: z.number().int(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedMinutes: z.number().int().min(2).max(12),   // ép "ngắn gọn"
  viz: z.string().optional(),                          // id trong registry
  prerequisites: z.array(z.string()).default([]),
  languages: z.array(z.enum(['c','cpp','java','py','js'])).default([]),
  problems: z.array(z.string()).default([]),
});
```

Script `lint-content.ts` chạy trong CI, **fail build** nếu:
- Bài trong nhóm DSA mà không có `viz`
- `prerequisites` trỏ tới slug không tồn tại
- Nội dung > 700 từ (trừ trang tổng quan)
- Code block không khai báo ngôn ngữ

### 5.4. Vấn đề bản quyền — bắt buộc tuân thủ

**Không được copy đề bài, testcase, hay lời giải từ LeetCode / HackerRank.** Nội dung đó có bản quyền.

Cách làm hợp lệ:
- Tự viết đề bài (diễn đạt lại bài toán kinh điển bằng ngôn từ của mình — thuật toán là kiến thức chung, cách diễn đạt thì không).
- Tự sinh testcase bằng script.
- Ở cuối mỗi bài, **link ra ngoài** tới bài tương ứng trên LeetCode/HackerRank để người học luyện thêm.

---

## 6. Code Runner

### 6.1. Phân tầng

| Tầng | Ngôn ngữ | Cơ chế | Độ trễ | Dùng khi |
|---|---|---|---|---|
| **Tier 1 — Browser** | JS/TS | Web Worker + timeout 3s | ~0 ms | "Run" ví dụ trong bài học |
| **Tier 1 — Browser** | Python | Pyodide (lazy load, self-host) | ~2 s lần đầu, sau đó ~0 | Ví dụ Python |
| **Tier 2 — Judge0** | C, C++, Java, Python, JS, … | HTTP API qua nginx | 200–800 ms | "Submit" bài tập, đo time/memory |

**Quyết định có chủ đích:** *không* làm clang-WASM để biên dịch C/C++ trong trình duyệt ở Phase 1. Asset rất nặng (hàng chục MB) và thư viện chuẩn không đầy đủ. Vì đã có Judge0 rồi thì đi qua Judge0 gọn hơn nhiều. Có thể xem lại ở Phase 4 nếu muốn dùng offline hoàn toàn không cần server.

### 6.2. Judge0 client

```ts
// apps/web/src/lib/judge.ts
const JUDGE = '/api/judge';   // nginx proxy, KHÔNG phải URL Judge0 trực tiếp

export async function submitBatch(subs: Submission[]): Promise<Result[]> {
  const res = await fetch(`${JUDGE}/submissions/batch?base64_encoded=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      submissions: subs.map(s => ({
        language_id: s.languageId,
        source_code: b64(s.source),
        stdin: b64(s.stdin),
        cpu_time_limit: 5,
        memory_limit: 128000,
      })),
    }),
  });
  const tokens = (await res.json()).map((t: any) => t.token);
  return pollBatch(tokens);   // GET /submissions/batch?tokens=...
}
```

Ghi chú thực thi:
- Luôn dùng `base64_encoded=true` để tránh lỗi ký tự và newline.
- Dùng **batch endpoint** để chạy nhiều testcase trong 1 lần gọi.
- Poll với backoff (200 ms → 400 ms → 800 ms), timeout tổng 30 s.
- **Không hardcode `language_id`.** Chạy `scripts/map-judge0-languages.ts` lúc build, gọi `GET /languages` và sinh ra file mapping. Language ID thay đổi giữa các version Judge0.

### 6.3. Chấm bài phía client

```
1. Client đọc problem.json (đã build sẵn)
2. Gửi batch: mỗi testcase là 1 submission với stdin tương ứng
3. Nhận kết quả → normalize stdout (trim trailing whitespace mỗi dòng)
4. Sample test  → so sánh trực tiếp với expected
   Hidden test  → so sánh sha256(normalized) với hash đã ship
5. Hiển thị: Accepted / Wrong Answer #k / TLE / Compile Error / Runtime Error
6. Lưu submission vào IndexedDB
```

### 6.4. Cấu hình nginx cho Judge0

```nginx
# infra/nginx/site.conf
limit_req_zone $binary_remote_addr zone=judge:10m rate=10r/m;

server {
  listen 80;
  root /var/www/cs-learning;   # output tĩnh của Astro

  location / { try_files $uri $uri/ /404.html; }

  location /api/judge/ {
    limit_req zone=judge burst=5 nodelay;

    proxy_pass http://judge0:2358/;
    proxy_set_header X-Auth-Token $JUDGE0_AUTH_TOKEN;   # token KHÔNG lộ ra client
    proxy_set_header X-Real-IP $remote_addr;

    client_max_body_size 128k;      # chặn payload lớn
    proxy_read_timeout 40s;
  }
}
```

### 6.5. ⚠ Bảo mật Judge0 — không được bỏ qua

Judge0 chạy sandbox bằng `isolate` (Linux namespaces + cgroups) nhưng **container của nó cần cờ `--privileged`**, tức là được cấp quyền gần như ngang với host. Đây là rủi ro thật, không phải cảnh báo hình thức.

Bắt buộc khi lên production:

1. Judge0 chạy trên **VM/host riêng**, không chung máy với web server.
2. Không mở port 2358 ra internet — chỉ nginx được phép truy cập (firewall / private network).
3. Đặt `AUTH_TOKEN` mạnh trong `judge0.conf`, không commit vào git.
4. Bật `ENABLE_NETWORK=false` để code người dùng không gọi ra ngoài được.
5. Giới hạn: `cpu_time_limit=5s`, `memory_limit=128MB`, `max_processes_and_or_threads=30`, `max_file_size=1024KB`.
6. Rate limit ở nginx (đã cấu hình ở trên) + giới hạn kích thước source code.
7. Snapshot VM định kỳ, coi máy Judge0 là **disposable** — nếu nghi ngờ bị compromise thì destroy và dựng lại, không cứu chữa.

---

## 7. Lưu tiến độ (không có backend)

```ts
// IndexedDB qua idb-keyval
interface ProgressStore {
  'lesson:<slug>':   { status: 'unread'|'reading'|'done'; visitedAt: number; };
  'quiz:<slug>':     { score: number; total: number; attempts: number; };
  'problem:<id>':    { status: 'attempted'|'solved'; bestRuntimeMs?: number;
                       lastSource: Record<Lang, string>; };
  'settings':        { theme; vizSpeed; preferredLanguage; reducedMotion; };
}
```

Vì không có tài khoản, người học sẽ **mất toàn bộ tiến độ nếu xóa dữ liệu trình duyệt**. Bắt buộc phải có:

- Nút **Export progress** → tải về file JSON
- Nút **Import progress** → nạp lại
- Banner nhắc nhở ở trang Progress: dữ liệu chỉ nằm trên máy này

Thanh tiến độ hiển thị ở sidebar (đã học X/Y bài trong module) — đây là động lực học rất hiệu quả và gần như miễn phí về mặt kỹ thuật.

---

## 8. Design system

### 8.1. Ý tưởng chủ đạo: **"Trace"**

Chủ đề của cả trang web là *quan sát máy tính suy nghĩ từng bước*. Ngôn ngữ hình ảnh vì thế lấy từ thế giới của **step debugger và logic analyzer**, không phải từ mẫu landing page SaaS.

### 8.2. Palette — dẫn xuất từ ngữ nghĩa của visualization

Đây là quyết định quan trọng: **màu thương hiệu chính là màu trạng thái của thuật toán**, không phải hai thứ tách rời. Người học nhìn thấy màu vàng ở nút "Compare" trong viz và ở nút primary của site là cùng một ý nghĩa.

```css
/* tokens.css */
--ink:        #12161C;   /* nền dark, xanh-đen chứ không đen tuyệt đối */
--paper:      #F7F5F0;   /* nền light, hơi ấm để đọc lâu không mỏi */
--rule:       #2A313B;   /* đường kẻ, viền */

/* Màu ngữ nghĩa — dùng chung cho viz VÀ cho UI */
--signal:     #E8B33C;   /* compare / cursor / primary action */
--commit:     #3FB984;   /* done / sorted / accepted */
--discard:    #E5654B;   /* discard / wrong answer */
--probe:      #57A8E8;   /* visited / info */
--muted:      #7A8493;   /* trạng thái mặc định */
```

Cố tình **tránh** hai lối mòn: nền kem + serif + accent đất nung, và nền đen tuyền + accent xanh neon. Cả hai đều đang xuất hiện ở mọi nơi và không nói lên điều gì về chủ đề.

### 8.3. Typography

| Vai trò | Font | Lý do |
|---|---|---|
| Display | **Archivo** (weight 600–700, hơi mở rộng) | Grotesk kỹ thuật, có cá tính nhưng không màu mè |
| Body | **IBM Plex Sans** | Được thiết kế cho một công ty công nghệ, đọc dài rất tốt |
| Code / data | **IBM Plex Mono** | Cùng gia đình với body → nhịp chữ thống nhất giữa văn bản và code |

Plex Sans + Plex Mono khớp nhau về chiều cao x-height và độ dày nét, nên khi code nằm giữa đoạn văn (chuyện xảy ra ở *mọi* bài học) trang không bị "giật".

Type scale: 14 / 16 / 18 / 22 / 28 / 36 / 48. Body 18px, line-height 1.65, độ rộng cột tối đa 68ch.

### 8.4. Signature element: **Frame Rail**

Thanh scrub ngang có vạch chia — mỗi vạch là một bước của thuật toán. Nó xuất hiện dưới **mọi** visualization trên toàn site, và trở thành nhân vật chính ở trang chủ: người dùng kéo thanh rail và chính hero của trang chủ tự sắp xếp lại trước mắt họ.

Một signature duy nhất, lặp lại nhất quán. Mọi thứ còn lại giữ im lặng và kỷ luật.

### 8.5. Chất lượng nền

- Responsive xuống 360px (viz chuyển sang layout dọc, controls dính đáy màn hình)
- Focus ring nhìn thấy rõ trên mọi control
- `prefers-reduced-motion` được tôn trọng ở tất cả animation
- Contrast tối thiểu AA; các màu ngữ nghĩa **không được là kênh thông tin duy nhất** — luôn kèm nhãn chữ hoặc pattern (quan trọng cho người mù màu, và ~8% nam giới bị mù màu đỏ-lục)

---

## 9. Môi trường offline

### 9.1. Yêu cầu máy dev

- Node.js 22 LTS, pnpm 9
- Docker + Docker Compose (Judge0 cần Linux kernel — Windows dùng WSL2)
- RAM ≥ 8 GB (Judge0 + Postgres + Redis ~2 GB)

### 9.2. docker-compose.dev.yml

```yaml
services:
  judge0:
    image: judge0/judge0:1.13.1
    privileged: true
    ports: ["2358:2358"]
    environment:
      - POSTGRES_HOST=db
      - REDIS_HOST=redis
      - ENABLE_NETWORK=false
      - AUTH_TOKEN=${JUDGE0_AUTH_TOKEN}
    depends_on: [db, redis]

  judge0-workers:
    image: judge0/judge0:1.13.1
    command: ["./scripts/workers"]
    privileged: true
    depends_on: [db, redis]

  db:
    image: postgres:16
    environment: [POSTGRES_DB=judge0, POSTGRES_USER=judge0,
                  POSTGRES_PASSWORD=${POSTGRES_PASSWORD}]
    volumes: ["judge0-db:/var/lib/postgresql/data"]

  redis:
    image: redis:7
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}"]

volumes: { judge0-db: }
```

### 9.3. Lệnh khởi động

```bash
cp .env.example .env          # điền JUDGE0_AUTH_TOKEN, POSTGRES_PASSWORD, REDIS_PASSWORD
docker compose -f infra/docker-compose.dev.yml up -d
pnpm install
pnpm --filter web dev         # http://localhost:4321
```

### 9.4. Đảm bảo offline 100%

- Font: tự host trong `public/fonts/`, **không dùng Google Fonts CDN**
- Pyodide: tải asset về `public/pyodide/` bằng script, không dùng jsDelivr
- Mermaid: render **build-time** thành SVG, runtime không tải gì
- Search: Pagefind sinh index ngay trong output, chạy hoàn toàn trong browser
- Có script `pnpm check:offline` chạy build rồi grep output tìm URL ngoài → fail nếu có

---

## 10. Deployment

### 10.1. Topology production

```
Internet
   │
   ▼
[ nginx / VM-1 ]  ── serve static (Astro dist) + TLS + rate limit
   │  private network only
   ▼
[ Judge0 / VM-2 ]  ── privileged containers, KHÔNG mở ra internet
```

### 10.2. Quy trình

```bash
# Build
pnpm build                      # → apps/web/dist/
pnpm test && pnpm lint:content  # gate

# Deploy web
rsync -az --delete apps/web/dist/ deploy@vm1:/var/www/cs-learning/

# Deploy Judge0 (VM-2, ít khi thay đổi)
docker compose -f infra/docker-compose.prod.yml up -d
```

### 10.3. Checklist trước khi go-live

- [ ] Port 2358 **không** truy cập được từ internet
- [ ] `AUTH_TOKEN` đã đặt, không nằm trong git history
- [ ] `ENABLE_NETWORK=false` trên Judge0
- [ ] Rate limit nginx đã bật và đã test
- [ ] HTTPS + HSTS
- [ ] CSP header (`script-src 'self'`; Pyodide cần `'wasm-unsafe-eval'`)
- [ ] Lighthouse: Performance ≥ 95 trên trang bài học tĩnh
- [ ] Backup: Postgres của Judge0 chỉ chứa lịch sử submission → có thể bỏ; **nội dung nằm ở git là nguồn sự thật duy nhất**
- [ ] Kiểm tra một bài học bất kỳ với JS tắt → vẫn đọc được nội dung (chỉ mất viz)

### 10.4. CI (GitHub Actions)

```
on PR:  typecheck → vitest → build → lint:content → check:offline → Playwright smoke
on main: build → deploy static → purge cache
```

---

## 11. Lộ trình

### Phase 0 — Nền móng (2 tuần)

| Deliverable | Ghi chú |
|---|---|
| Monorepo + Astro/Starlight scaffold | Khóa version |
| Design tokens + typography | §8 |
| Sidebar theo cây ưu tiên §5.1, các trang mới chỉ là stub | |
| `viz-core` types + Player + `ArrayView` | Renderer đầu tiên |
| 3 bài mẫu hoàn chỉnh: Binary Search, Bubble Sort, Big-O | Dùng làm chuẩn cho mọi bài sau |
| `docker-compose.dev.yml` chạy được offline | |

**Exit criteria:** một người ngoài dự án đọc `AUTHORING.md` và tự viết được bài học thứ 4 mà không cần hỏi.

### Phase 1 — DSA + Code Runner (5–6 tuần)

| Deliverable | Số lượng |
|---|---|
| Renderers: Matrix2D, LinkedList, Tree, Graph, StackFrame | 5 |
| Data Structures: array, linked list, stack, queue, hash table, tree, BST, heap, graph, trie | ~14 bài |
| Algorithms: sorting (5), searching (2), recursion, BFS/DFS, Dijkstra, greedy, DP cơ bản, two-pointer, sliding window | ~18 bài |
| Complexity: Big-O, phân tích amortized | 3 bài |
| Browser runner (JS + Pyodide) | |
| Judge0 integration + trang Problem | |
| Bộ đề tự viết + testcase | 25 bài |
| Progress store + export/import | |

**Exit criteria:** người học có thể đi từ bài đầu đến hết DSA, xem viz, chạy code, nộp bài, và thấy tiến độ của mình.

### Phase 2 — Ngôn ngữ lập trình (4 tuần)

- C: con trỏ, quản lý bộ nhớ, mảng vs con trỏ, struct, compile pipeline → **`MemoryView` là renderer chủ lực ở đây**
- C++: RAII, tham chiếu, STL container, template cơ bản
- Java: JVM, stack vs heap, GC, collections, generics
- Mỗi ngôn ngữ ~12–15 bài
- Viz đặc thù: sơ đồ bộ nhớ có mũi tên, quá trình compile → link → run

### Phase 3 — Systems (4 tuần)

- `TerminalView`: xterm.js + filesystem ảo trong JS, cài sẵn ~30 lệnh (`ls cd pwd mkdir cat grep chmod ps kill find pipe redirect ...`)
- Linux: filesystem hierarchy, permissions, process, signals, pipes, systemd
- Unix: triết lý Unix, khác biệt so với Linux, POSIX
- Windows: NTFS, services, PowerShell, Registry, so sánh song song với Linux
- Bài tập tương tác: "hãy tìm file lớn hơn 10 MB trong /var" → gõ trong terminal ảo, kiểm tra kết quả

### Phase 4 — Kiến thức kỹ nghệ (5 tuần)

- Design Patterns (~20 pattern): mỗi pattern = class diagram (Mermaid) + sequence diagram tương tác + ví dụ before/after
- DevOps, CI/CD: `FlowView` — pipeline kéo-thả, click từng stage để xem log mô phỏng
- Full Stack: request lifecycle tương tác (browser → DNS → LB → app → DB → về)
- Solution Architecture: sơ đồ kiến trúc có thể bật/tắt component để thấy điểm chết
- Career Path: roadmap dạng graph, đồng bộ với tiến độ đã học

> Cần chấp nhận: nhóm này bản chất là **kiến thức khái niệm**, visualization sẽ là *sơ đồ tương tác* chứ không phải animation từng bước. Cố ép animation vào đây sẽ tốn thời gian mà không tăng giá trị học tập.

### Phase 5 — Backend (tùy chọn, sau khi có người dùng thật)

Chỉ làm khi thực sự cần: tài khoản, đồng bộ đa thiết bị, hidden testcase thật sự bí mật, leaderboard, analytics nội dung.

Khi đó thêm một API service (Spring Boot hoặc Node đều được — khi ấy anh đã có dữ liệu để quyết định), site tĩnh giữ nguyên, chỉ đổi `lib/progress.ts` từ IndexedDB sang API. **Vì đã tách sẵn qua interface nên chi phí chuyển đổi rất thấp** — đây là lý do §7 được thiết kế như vậy ngay từ đầu.

---

## 12. Definition of Done cho một bài học

Một bài học chỉ được merge khi:

- [ ] Frontmatter đầy đủ, `estimatedMinutes` ≤ 12
- [ ] Nội dung ≤ 700 từ
- [ ] Có ít nhất 1 visualization tương tác **cho phép người học đổi input**
- [ ] Có ví dụ code chạy được, ≤ 30 dòng, đã test qua runner
- [ ] Có 2–3 câu quiz kèm giải thích cho đáp án sai
- [ ] `prerequisites` trỏ tới slug có thật
- [ ] Đọc được khi tắt JavaScript
- [ ] Không có URL ngoài trong asset
- [ ] Đọc tốt trên màn hình 360px

---

## 13. Rủi ro và cách xử lý

| Rủi ro | Mức độ | Xử lý |
|---|---|---|
| **Nội dung là nút cổ chai, không phải code** — 150+ bài × (viết + viz + ví dụ + quiz) | Cao | Chốt phạm vi Phase 1 thật hẹp. Thà 40 bài xuất sắc còn hơn 200 bài dở. Template hóa mạnh để giảm chi phí biên |
| Viz engine bị over-engineer trước khi có đủ bài học | Cao | Quy tắc "3 bài mới thêm renderer". Xây `ArrayView` trước, các renderer khác chỉ khi thực sự cần |
| Judge0 bị lạm dụng / tấn công | Cao | §6.5 — VM riêng, không network, rate limit, coi máy là disposable |
| Starlight 0.x breaking change | Trung bình | Khóa version chính xác, nâng cấp có chủ đích, có E2E test bắt lỗi |
| Testcase lộ do không có backend | Trung bình | Hash hidden testcase (§0.1). Chấp nhận ở giai đoạn học, giải quyết ở Phase 5 |
| Người học mất tiến độ khi xóa cache trình duyệt | Trung bình | Export/import JSON + banner cảnh báo rõ ràng |
| Nhóm DevOps/Architect khó visualize | Trung bình | Hạ kỳ vọng xuống "sơ đồ tương tác", không cố làm animation |
| Pyodide nặng làm chậm trang | Thấp | Lazy load, chỉ tải khi người dùng bấm "Run" ở bài Python |

---

## 14. Ước lượng tổng

| Phase | Thời lượng | Kết quả |
|---|---|---|
| 0 — Nền móng | 2 tuần | Chạy được, có 3 bài mẫu chuẩn |
| 1 — DSA + Runner | 5–6 tuần | ~35 bài + 25 problem, dùng thật được |
| 2 — Ngôn ngữ | 4 tuần | ~40 bài |
| 3 — Systems | 4 tuần | ~30 bài + terminal ảo |
| 4 — Kỹ nghệ | 5 tuần | ~50 bài |
| **Tổng đến MVP đầy đủ** | **~20 tuần** | ~155 bài |

Con số này giả định một người làm toàn thời gian. Nếu làm ngoài giờ, nhân đôi. **Phase 0 + Phase 1 (~8 tuần) đã là một sản phẩm dùng được và đáng public** — nên coi đó là mốc thật, phần còn lại là mở rộng dần.

---

## 15. Việc cần làm ngay (tuần 1)

1. `pnpm create astro@latest` với template Starlight, khóa version
2. Dựng `infra/docker-compose.dev.yml`, xác nhận Judge0 chạy: `curl localhost:2358/about`
3. Viết `packages/viz-core/src/types.ts` + `binarySearch` generator + test
4. Dựng `ArrayView` + `Player`, ghép vào 1 trang MDX
5. Áp design tokens §8, dựng 1 trang bài học hoàn chỉnh làm chuẩn
6. Viết `docs/AUTHORING.md` dựa trên chính bài học vừa dựng
7. Chốt danh sách 35 bài của Phase 1 và ghi vào một file `ROADMAP-CONTENT.md`

Bước 7 quan trọng hơn vẻ ngoài của nó: có danh sách cố định thì mới đo được tiến độ, và mới cưỡng lại được cám dỗ đi lan man sang các nhóm nội dung khác.
