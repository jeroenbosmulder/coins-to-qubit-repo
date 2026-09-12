#!/usr/bin/env python3
"""Regenerate index.html from build-your-own-qubit.jsx.

index.html is the self-contained page (React + Babel from a CDN, the jsx
inlined). Edit the jsx, then run:  python3 build-index.py
"""
import re, pathlib

here = pathlib.Path(__file__).parent
jsx = (here / "build-your-own-qubit.jsx").read_text()

body = jsx.replace(
    'import { useState, useMemo, useEffect, useRef } from "react";',
    "const { useState, useMemo, useEffect, useRef } = React;", 1)
body = re.sub(r"^export default (\w+);\s*$", "", body, flags=re.M)
body = body.replace("export default function ", "function ")
body = body.replace("export function ", "function ")

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Build your own qubit</title>
<link rel="apple-touch-icon" href="apple-touch-icon.png" />
<link rel="icon" type="image/png" href="apple-touch-icon.png" />
<meta name="apple-mobile-web-app-title" content="Qubit" />
<meta name="theme-color" content="#FFFFFF" />
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
<!-- room mode (only active with ?session=CODE); harmless when opened standalone -->
<script src="../room/relay-config.js"></script>
<script src="../room/relay-transport.js"></script>
<script src="../room/room.js"></script>
<style>html, body {{ margin: 0; padding: 0; }}</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
{body.rstrip()}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));

</script>
</body>
</html>
"""
(here / "index.html").write_text(html)
print(f"index.html written ({len(html):,} bytes)")
