# Canvas Examples

The REPL includes six draw helpers that render to the canvas panel. Run these **in sequence** at [rust42.cc](https://rust42.cc) by pressing **Ctrl+Enter**.

---

## Getting Started

```rust
_clear();
_circle(230, 150, 80);
```

```rust
_clear();
_rect(100, 100, 80, 40, 255, 100, 50);
_rect(200, 80, 60, 100, 50, 100, 255);
```

```rust
_clear();
_line(10, 10, 450, 290, 100, 200, 255);
_line(10, 290, 450, 10, 200, 100, 255);
```

---

## Patterns

```rust
_clear();
for i in 0..20 {
    _circle_color(230, 150, i * 4, 100 + i as u8 * 7, 150 - i as u8 * 3, 200);
}
```

```rust
_clear();
for i in 0..16 {
    _line(
        230 + (((i as f64) * 0.392).sin() * 120.0) as i32,
        150 + (((i as f64) * 0.392).cos() * 120.0) as i32,
        230 + ((((i as f64 + 1.0) * 0.392).sin() * 120.0) as i32),
        150 + ((((i as f64 + 1.0) * 0.392).cos() * 120.0) as i32),
        100 + i as u8 * 10, 200, 150 + i as u8 * 6,
    );
}
```

---

## Sine Wave

```rust
_clear();
let w = 460.0;
let h = 300.0;
for x in 0..460 {
    let t = x as f64 / w * 4.0 * 3.14159;
    let y = (h / 2.0 - (t.sin() * (h / 3.0))) as i32;
    _pixel(x, y, 100, 200, 255);
}
```

```rust
_clear();
let w = 460.0;
let h = 300.0;
for x in 0..460 {
    let t = x as f64 / w * 8.0 * 3.14159;
    let y = (h / 2.0 - (t.sin() * (h / 4.0))) as i32;
    _pixel(x, y, x as u8 / 2, (255 - x as u8) / 2, 150 + x as u8 / 3);
}
```

---

## Bar Chart

```rust
_clear();
for i in 0..10 {
    let h = 20 + i * 25;
    _rect(10 + i * 45, 280 - h, 35, h, 100 + i as u8 * 15, 200, 100 + i as u8 * 10);
}
```

```rust
_clear();
let values = [45, 120, 80, 200, 60, 150, 30, 180, 95, 140];
for i in 0..10 {
    let h = values[i];
    _rect(
        10 + i as i32 * 45, 280 - h,
        35, h,
        100 + (i as f64 * 15.0) as u8,
        200 - (i as f64 * 15.0) as u8,
        100 + i as u8 * 10,
    );
}
```

---

## Grid

```rust
_clear();
for x in (0..460).step_by(20) {
    _line(x, 0, x, 299, 40, 40, 60);
}
for y in (0..300).step_by(20) {
    _line(0, y, 459, y, 40, 40, 60);
}
```

```rust
_clear();
for x in 0..23 {
    _line(x * 20, 0, x * 20, 299, 40, 40, 60);
}
for y in 0..15 {
    _line(0, y * 20, 459, y * 20, 40, 40, 60);
}
for i in 0..10 {
    _circle_color(230, 150, i * 14, 100, 180, 255);
}
```

---

## Random Scatter

```rust
_clear();
let mut seed = 12345u32;
for _ in 0..200 {
    seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
    let x = (seed >> 16) as i32 % 460;
    seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
    let y = (seed >> 16) as i32 % 300;
    seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
    let r = (seed >> 16) as u8;
    seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
    let g = (seed >> 16) as u8;
    seed = seed.wrapping_mul(1103515245).wrapping_add(12345);
    let b = (seed >> 16) as u8;
    _pixel(x, y, r, g, b);
}
```

---

## Helpers Reference

| Function | Arguments |
|----------|-----------|
| `_clear()` | no args |
| `_circle(x, y, radius)` | x, y, radius: i32 |
| `_circle_color(x, y, radius, r, g, b)` | x, y, radius: i32, r, g, b: u8 |
| `_rect(x, y, w, h, r, g, b)` | x, y, w, h: i32, r, g, b: u8 |
| `_line(x1, y1, x2, y2, r, g, b)` | x1, y1, x2, y2: i32, r, g, b: u8 |
| `_pixel(x, y, r, g, b)` | x, y: i32, r, g, b: u8 |

Canvas is 460×300 pixels. Coordinates top-left origin. Colors are RGB with u8 values (0–255).