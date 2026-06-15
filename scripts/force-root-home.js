hexo.extend.generator.register('force_root_home', function(locals) {
  return [
    {
      path: 'index.html',
      data: function() {
        return hexo.render.renderSync({ path: 'source/index.html', engine: 'html' });
      },
      layout: false
    }
  ];
});
