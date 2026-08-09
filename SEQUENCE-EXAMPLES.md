# Sequence Examples

Copy each section **in sequence** into the editor at [rust42.cc](https://rust42.cc) and press **Ctrl+Enter** to run. The session remembers state — each step builds on the last.

---

## Getting Started

```rust
println!("hello, world");
```

```rust
let name = "Rust";
println!("hello, {name}");
```

---

## Numbers and Math

```rust
let x = 42;
println!("x = {x}");
```

```rust
let y = x * 3;
println!("x = {x}, y = {y}");
```

```rust
let sum = x + y;
println!("{x} + {y} = {sum}");
```

---

## Strings

```rust
let s = String::from("hello");
println!("{s}");
```

```rust
let upper: String = s.chars().map(|c| c.to_uppercase().next().unwrap()).collect();
println!("{upper}");
```

---

## Collections

```rust
let nums: Vec<i32> = (1..=10).collect();
println!("{nums:?}");
```

```rust
let doubled: Vec<i32> = nums.iter().map(|n| n * 2).collect();
println!("{doubled:?}");
```

```rust
let sum: i32 = nums.iter().sum();
println!("sum = {sum}");
```

---

## Conditionals

```rust
let age = 17;
if age >= 18 {
    println!("adult");
} else {
    println!("minor");
}
```

---

## Loops

```rust
for i in 0..5 {
    println!("loop {i}");
}
```

```rust
let mut total = 0;
for i in 1..=100 {
    total += i;
}
println!("1 + 2 + ... + 100 = {total}");
```

---

## Functions in the REPL

```rust
fn square(x: i32) -> i32 { x * x }
println!("square(5) = {}", square(5));
```

```rust
println!("square(12) = {}", square(12));
```

---

## Structs

```rust
struct Point { x: f64, y: f64 }
let p = Point { x: 3.0, y: 4.0 };
println!("({}, {})", p.x, p.y);
```

```rust
fn distance(a: &Point, b: &Point) -> f64 {
    let dx = a.x - b.x;
    let dy = a.y - b.y;
    (dx * dx + dy * dy).sqrt()
}
let origin = Point { x: 0.0, y: 0.0 };
println!("distance = {:.2}", distance(&p, &origin));
```

---

## Pattern Matching

```rust
let value = Some(42);
match value {
    Some(n) => println!("got {n}"),
    None => println!("nothing"),
}
```

---

## Iterators and Closures

```rust
let even_squares: Vec<i32> = (1..=10)
    .filter(|n| n % 2 == 0)
    .map(|n| n * n)
    .collect();
println!("{even_squares:?}");
```

---

## Error Handling

```rust
let result: Result<i32, &str> = Ok(42);
match result {
    Ok(v) => println!("ok: {v}"),
    Err(e) => println!("err: {e}"),
}
```

---

## Try These Edge Cases

This will fail — type mismatch:

```rust
let bad: u32 = "nope";
```

The error won't poison your session. Try again with something correct:

```rust
let fine = 99;
println!("still works: {fine}");
```

---

## Performance Test

```rust
let mut sum: i64 = 0;
for i in 0..100_000 {
    sum += i;
}
println!("sum = {sum}");
```

---

## Tips

- Each command replays the full session — later commands have access to everything defined earlier.
- Commands that fail to compile are not added to your session — fix and retry.
- Click a command in the timeline to see the full reconstructed source at that point.
- Use **Reset Session** to start fresh.