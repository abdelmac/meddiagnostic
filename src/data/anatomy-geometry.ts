import type { AnatomyView } from "./anatomy-structures";

export type AnatomyShape = {
  id: string;
  views: readonly AnatomyView[];
  path: string;
  anchor: readonly [number, number];
  mirror?: boolean;
  strokeWidth?: number;
  color?: string;
};

export const anatomyCanvas = { width: 320, height: 720 } as const;
export const humanOutline = "M145 91 C130 84 128 69 130 48 C132 23 145 17 160 17 C175 17 188 23 190 48 C192 69 190 84 175 91 L175 104 C187 115 207 111 219 124 C236 142 237 166 243 192 L256 247 C260 262 260 272 257 283 L273 352 L280 371 L289 389 Q292 397 286 396 L277 385 L283 413 Q283 423 277 419 L272 400 L275 425 Q273 433 268 426 L263 402 L264 426 Q260 433 256 425 L252 402 L251 419 Q247 425 243 418 L241 388 Q239 379 244 369 L228 304 Q220 286 219 270 L205 208 Q203 193 199 178 C197 210 194 244 200 272 C207 299 212 322 207 350 L201 392 Q201 432 190 477 L186 496 C194 519 189 548 184 571 L181 625 L184 649 L196 668 Q200 681 188 683 L170 683 Q160 681 162 667 L168 642 L169 624 L166 574 Q160 536 170 498 L169 477 Q161 435 160 389 Q159 435 151 477 L150 498 Q160 536 154 574 L151 624 L152 642 L158 667 Q160 681 150 683 L132 683 Q120 681 124 668 L136 649 L139 625 L136 571 C131 548 126 519 134 496 L130 477 C119 432 119 392 119 392 L113 350 C108 322 113 299 120 272 C126 244 123 210 121 178 Q117 193 115 208 L101 270 Q100 286 92 304 L76 369 Q81 379 79 388 L77 418 Q73 425 69 419 L68 402 L64 425 Q60 433 56 426 L57 402 L52 426 Q47 433 45 425 L48 400 L43 419 Q37 423 37 413 L43 385 L34 396 Q28 397 31 389 L40 371 L47 352 L63 283 Q60 272 64 247 L77 192 C83 166 84 142 101 124 C113 111 133 115 145 104 Z";

const front: readonly AnatomyView[] = ["anterior"];
const back: readonly AnatomyView[] = ["posterior"];
const both: readonly AnatomyView[] = ["anterior", "posterior"];

// Coordinates are drawn for MedQuiz. They encode landmarks, not clinical depth or scale.
// A mirrored path represents a paired structure; the target anchor refers to one side.
export const anatomyShapes: readonly AnatomyShape[] = [
  { id: "clavicle", views: front, mirror: true, anchor: [133, 128], strokeWidth: 6,
    path: "M157 132 C146 127 136 133 127 129 S111 126 105 133" },
  { id: "scapula", views: back, mirror: true, anchor: [132, 161],
    path: "M114 132 Q127 135 143 144 L138 192 Q120 182 112 156 Z" },
  { id: "humerus", views: both, mirror: true, anchor: [101, 213],
    path: "M100 147 Q91 142 88 152 Q85 162 92 168 L78 245 Q71 251 76 257 Q83 262 90 256 Q96 252 90 245 L106 170 Q115 165 111 156 Q108 149 100 147 Z" },
  { id: "radius", views: front, mirror: true, anchor: [66, 317],
    path: "M77 267 Q74 262 71 269 L51 355 Q47 358 48 364 L58 366 Q63 364 61 357 L80 277 Q84 269 77 267 Z" },
  { id: "ulna", views: front, mirror: true, anchor: [78, 308],
    path: "M88 262 Q80 260 80 269 L80 277 L62 357 Q58 362 61 367 Q66 372 70 366 L88 282 Q94 272 88 262 Z" },
  { id: "femur", views: both, mirror: true, anchor: [139, 421],
    path: "M145 352 Q151 346 155 354 Q158 361 151 366 L140 372 L145 474 Q152 480 147 488 Q143 494 137 488 Q131 493 126 487 Q123 482 130 475 L126 379 Q121 369 128 362 Q134 357 139 363 Z" },
  { id: "pelvis", views: both, anchor: [132, 329],
    path: "M154 302 Q142 298 128 304 Q115 312 119 332 L129 353 Q136 346 143 353 L151 369 L160 363 L169 369 L177 353 Q184 346 191 353 L201 332 Q205 312 192 304 Q178 298 166 302 L164 329 L160 341 L156 329 Z M135 333 Q143 329 148 342 Q144 350 137 346 Z M185 333 Q177 329 172 342 Q176 350 183 346 Z" },
  { id: "patella", views: front, mirror: true, anchor: [138, 494],
    path: "M132 488 Q139 483 145 489 Q148 496 138 504 Q128 496 132 488 Z" },
  { id: "tibia", views: front, mirror: true, anchor: [145, 558],
    path: "M137 508 Q143 504 149 510 L149 535 L145 620 Q148 628 143 632 L136 630 Q133 626 136 620 L137 537 Q130 516 137 508 Z" },
  { id: "deltoid", views: both, mirror: true, anchor: [100, 149],
    path: "M105 126 Q91 132 87 151 Q85 168 94 185 Q107 172 116 153 L120 138 Z" },
  { id: "biceps", views: front, mirror: true, anchor: [100, 206],
    path: "M106 174 Q115 181 109 206 L93 245 Q86 251 81 244 L85 216 Q86 190 98 175 Z" },
  { id: "triceps", views: back, mirror: true, anchor: [101, 206],
    path: "M104 171 Q116 184 109 207 L93 248 Q88 257 81 249 L85 217 Q85 192 95 179 Z" },
  { id: "pectoralis-major", views: front, mirror: true, anchor: [137, 167],
    path: "M157 139 Q137 130 119 139 L109 152 Q118 178 146 185 L157 180 Z" },
  { id: "rectus-abdominis", views: front, mirror: true, anchor: [149, 239],
    path: "M147 192 L157 190 L157 286 Q152 302 145 313 L140 286 L141 209 Z" },
  { id: "quadriceps", views: front, mirror: true, anchor: [135, 420],
    path: "M124 356 Q137 350 150 367 L153 420 Q149 461 142 480 L133 481 Q122 459 121 420 Q116 383 124 356 Z" },
  { id: "diaphragm", views: front, anchor: [134, 230],
    path: "M117 250 Q123 223 141 226 Q155 231 160 239 Q169 226 181 228 Q197 231 203 250 Q179 241 160 249 Q139 240 117 250 Z" },
  { id: "median-nerve", views: front, mirror: true, anchor: [69, 327], strokeWidth: 3,
    path: "M109 160 Q102 195 92 230 L85 260 L72 310 L59 367 L58 389 M58 385 L50 398 M58 385 L58 404 M58 385 L66 402" },
  { id: "ulnar-nerve", views: front, mirror: true, anchor: [87, 283], strokeWidth: 3,
    path: "M113 161 Q108 202 98 236 Q101 253 93 268 L84 299 L68 369 L69 389 L72 409 M69 389 L64 409" },
  { id: "radial-nerve", views: back, mirror: true, anchor: [88, 253], strokeWidth: 3.5,
    path: "M109 160 Q99 182 98 205 Q101 221 90 240 Q79 256 77 279 L66 326 L52 371 M52 371 L44 389 M52 371 L52 394" },
  { id: "sciatic-nerve", views: back, mirror: true, anchor: [137, 402], strokeWidth: 5,
    path: "M151 322 Q131 341 132 368 Q135 403 138 444 L139 481 M139 481 L129 509 M139 481 L146 508" },
  { id: "femoral-nerve", views: front, mirror: true, anchor: [132, 378], strokeWidth: 3.5,
    path: "M148 293 Q144 320 133 344 L128 369 M128 369 L125 407 M128 369 L135 416 M128 369 L143 403" },
  { id: "tibial-nerve", views: back, mirror: true, anchor: [143, 556], strokeWidth: 3.5,
    path: "M139 480 L143 517 Q141 561 145 604 L146 637 L150 657 M150 657 L139 671 M150 657 L151 673" },
  { id: "brachial-plexus", views: front, mirror: true, anchor: [127, 132], strokeWidth: 3,
    path: "M147 104 L136 121 L121 134 L109 160 M147 112 L132 132 L109 160 M147 122 L126 141 L109 160 M147 132 L130 146 L113 161 M147 141 L130 151 L113 161" },
  { id: "spinal-cord", views: back, anchor: [160, 209], strokeWidth: 6,
    path: "M160 87 L160 139 Q158 190 160 225 L160 276 L160 291" },
  { id: "lungs", views: front, anchor: [130, 200],
    path: "M146 152 Q130 150 119 175 Q112 200 115 230 Q128 240 147 230 L149 185 Z M174 152 Q190 150 201 175 Q208 200 205 230 Q190 237 176 229 L181 211 L170 196 Z" },
  { id: "heart", views: front, anchor: [172, 207],
    path: "M160 187 Q149 190 151 204 Q155 220 176 232 Q188 217 184 203 Q182 191 173 194 Q169 183 160 187 Z" },
  { id: "liver", views: front, anchor: [133, 261],
    path: "M118 248 Q135 239 163 248 L183 258 Q167 263 154 269 Q131 281 116 271 Z" },
  { id: "stomach", views: front, anchor: [180, 280],
    path: "M173 255 L179 259 Q185 251 194 262 Q203 276 190 289 Q179 300 166 289 L157 283 Q156 275 162 275 L170 282 Q180 281 179 271 L173 265 Z" },
  { id: "kidneys", views: back, anchor: [135, 272],
    path: "M133 250 Q122 250 123 268 Q124 289 134 291 Q143 291 142 280 Q133 275 140 267 Q143 256 133 250 Z M187 246 Q198 246 197 264 Q196 285 186 287 Q177 287 178 276 Q187 271 180 263 Q177 252 187 246 Z" },
  { id: "bladder", views: front, anchor: [160, 336],
    path: "M144 326 Q159 318 176 326 Q180 338 168 348 L162 352 L158 352 L152 348 Q140 338 144 326 Z" },
  { id: "aorta", views: front, anchor: [166, 266], strokeWidth: 6.5,
    path: "M169 194 L168 172 Q173 158 184 167 Q193 175 182 186 L168 190 L167 270 L166 321 M166 321 L140 346 M166 321 L184 346" },
  { id: "carotid", views: front, mirror: true, anchor: [147, 111], strokeWidth: 3.5,
    path: "M149 156 L147 128 L147 101 L143 86 M147 101 L152 87" },
  { id: "subclavian-artery", views: front, mirror: true, anchor: [126, 142], strokeWidth: 4,
    path: "M149 153 Q141 140 124 140 Q113 139 106 151" },
  { id: "femoral-artery", views: front, mirror: true, anchor: [134, 386], strokeWidth: 4,
    path: "M139 345 Q129 366 132 393 L140 456 L140 477" },
  { id: "inferior-vena-cava", views: front, color: "#5c82b3", anchor: [151, 279], strokeWidth: 6,
    path: "M150 202 L150 244 L153 281 L153 321 M153 321 L135 340 M153 321 L182 340 M153 270 L135 271 M153 270 L184 266" },
  { id: "pulmonary-artery", views: front, color: "#5c82b3", anchor: [160, 181], strokeWidth: 5,
    path: "M164 202 L166 181 Q158 174 148 180 L134 187 M166 181 L188 184" },
];

export function anatomyShape(id: string, view?: AnatomyView) {
  return anatomyShapes.find((shape) => shape.id === id && (!view || shape.views.includes(view)));
}

export function anatomyViewBox(zoom: number, anchor: readonly [number, number] = [160, 360]) {
  const safeZoom = Math.min(2.5, Math.max(1, Number.isFinite(zoom) ? zoom : 1));
  const width = anatomyCanvas.width / safeZoom;
  const height = anatomyCanvas.height / safeZoom;
  const x = Math.max(0, Math.min(anatomyCanvas.width - width, anchor[0] - width / 2));
  const y = Math.max(0, Math.min(anatomyCanvas.height - height, anchor[1] - height / 2));
  return { x, y, width, height };
}
