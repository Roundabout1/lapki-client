import process from 'node:process';
export function pathFix() {
  process.env.PATH = ['/usr/local/bin', process.env.PATH].join(':');
}
