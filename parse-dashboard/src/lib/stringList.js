

export default function stringList(strings, endDelineator = 'and') {
  let progress = [];

  strings.forEach((s, i) => {
    if ( i > 0) {
      if ( i === strings.length - 1) {
        if ( progress.length > 1) {
          progress.push(',');
        }
        progress.push(` ${endDelineator} `);
      } else {
        progress.push(', ');
      }
    }

    progress.push(s);
  });

  return progress.join('');
};