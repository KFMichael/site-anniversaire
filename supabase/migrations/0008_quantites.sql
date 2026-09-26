-- Quantité à acheter (texte libre : « 2 », « 500 g », « 1 paquet »…) sur
-- les produits du stock et les articles ponctuels de la liste de courses.
-- Effacée quand le produit repasse à « il en reste » (côté application).

alter table public.produits
  add column if not exists quantite text check (quantite is null or char_length(quantite) <= 20);

alter table public.articles_courses
  add column if not exists quantite text check (quantite is null or char_length(quantite) <= 20);
