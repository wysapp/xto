
export default function keyMirror(keys) {
  let map = {};
  for (let i = 0; i < keys.length; i++) {
    map[keys[i]] = keys[i];
  }
  return map;
}