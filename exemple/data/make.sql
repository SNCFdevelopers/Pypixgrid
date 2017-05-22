
-- creation de la grille
CREATE TABLE carreaux AS 
SELECT * FROM ST_CreateFishnet(1000, 1000, 50, 50, 3753000,2880000);
SELECT UpdateGeometrySRID('carreaux','geom',3035);

-- aggregation spatiale sur la grille
CREATE INDEX carreaux_geom_gist ON carreaux USING GIST (geom);
CREATE TABLE carreaux_horodateurs AS
SELECT c.row as row, c.col as col, h.numhoro 
FROM horodateurs_mobiliers as h, carreaux as c 
WHERE ST_Contains(c.geom,ST_Transform(h.wkb_geometry,3035));

-- aggregation temporelle
create table transactions_binned as  
select extract(isodow from to_timestamp(regexp_replace(date,'T',' '),'YYYY-MM-DD HH24:MI:SS'))*24+extract(hour from to_timestamp(regexp_replace(date,'T',' '),'YYYY-MM-DD HH24:MI:SS')) as time, * from transactions;

-- table de données finale
create table data_binned as 
select sum(cast(t.usager='Résident' as int)) as residents, sum(cast(t.usager='Rotatif' as int)) as  rotatif, 
sum(t.duree*cast(t.usager='Résident' as int)) as dureetotalresidents,
sum(t.duree*cast(t.usager='Rotatif' as int)) as dureetotalrotatifs,
t.time as time, ch.row as row, ch.col as col
from transactions_binned as t, horodateurs_mobiliers as h, carreaux_horodateurs as ch
where h.numhoro=ch.numhoro and t.id = h.numhoro
group by ch.row, ch.col, t.time;


