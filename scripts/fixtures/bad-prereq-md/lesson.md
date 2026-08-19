---
title: Bad Prereq MD Lesson
description: Regression fixture proving plain .md lessons are linted too.
order: 0
prerequisites:
  - /algorithms/does-not-exist
---

This is a plain .md lesson, not .mdx. The old file-discovery filter only
matched .mdx and silently skipped every rule on files like this one.
