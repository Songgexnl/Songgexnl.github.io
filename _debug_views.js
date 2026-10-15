const Hexo = require('hexo');
const hexo = new Hexo(process.cwd(), { silent: false });

hexo.init()
  .then(() => hexo.load())
  .then(() => {
    const keys = Object.keys(hexo.theme.views);
    console.log('=== theme views keys ===');
    console.log(keys);
    const v = hexo.theme.getView('post');
    console.log('getView(post) =>', v ? v.source : 'NOT FOUND');
    const v2 = hexo.theme.getView('index');
    console.log('getView(index) =>', v2 ? v2.source : 'NOT FOUND');
    process.exit(0);
  })
  .catch(err => { console.error('ERR', err); process.exit(1); });
