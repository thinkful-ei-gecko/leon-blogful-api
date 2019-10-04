const ArticlesService = {
  testFunction() { console.log('arrived'); },
  getArticles(db) {
    return db('blogful_articles')
      .select('*');
  },
  findById(db,id) {
    return db('blogful_articles')
      .select('*')
      .where('id',id)
      .first();
  },
  createArticle(db,newItem) {
    return db
      .insert(newItem)
      .into('blogful_articles')
      .returning('*')
      .then(rows => {
        return rows[0];
      });
  },
  updateArticle(db,id,itemInfo) {
    return db
      .from('blogful_articles')
      .where('id',id)
      .update(itemInfo);
  },
  deleteArticle(db,id) {
    return db('blogful_articles')
      .where('id',id)
      .delete();
  }

};

module.exports = ArticlesService;