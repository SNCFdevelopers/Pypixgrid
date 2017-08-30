#!/bin/bash
# verifier les paramètres de connexion à la base postgres
USER=xxx
DB=horodateurs
HOST=xx
# a modifier et decommenter en cas d'identification par mots de passe
#export PGPASSWORD=
psql -c "create database $DB" -U $USER -h $HOST
psql -d $DB -v DIR="$PWD" -f init.sql -U $USER -h $HOST
ogr2ogr -f PostgreSQL PG:"dbname=$DB user=$USER host=$HOST" ./raw_data/horodateurs-mobiliers.shp
psql -d $DB -f ../../postgis_functions.sql -U $USER -h $HOST
psql -d $DB -f make.sql -U $USER -h $HOST
