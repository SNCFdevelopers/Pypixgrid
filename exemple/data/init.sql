CREATE EXTENSION postgis;


CREATE TABLE transactions(
	id int NOT NULL,
	date varchar(200),
	usager varchar(200),
	paiment varchar(200),
	montant varchar(200),
	duree float,
	debut varchar(200),
	fin varchar(200)
);

-- télécharger les données sur opendata mairie de paris
-- http://opendata.paris.fr/explore/dataset/horodateurs-transactions-de-paiement/ !2.8Giga
-- suppression première ligne et import
-- sed '1d' horodateurs-transactions-de-paiement.csv > horodateurs-transactions-de-paiement-noheader.csv
-- sinon prendre le sample inclut dans le dépot horodateurs-transactions-sample.csv
\COPY transactions FROM 'raw_data/horodateurs-transactions-sample.csv' WITH delimiter ';';


