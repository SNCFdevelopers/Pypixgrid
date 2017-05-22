-- definition d'une fonction calculant la bounding box d'une tile
create or replace function TileBBox (z int, x int, y int, srid int = 3857)
    returns geometry
    language plpgsql immutable as
$func$
declare
    max numeric := 20037508.34;
    res numeric := (max*2)/(2^z);
    bbox geometry;
begin
    bbox := ST_MakeEnvelope(
        -max + (x * res),
        max - (y * res),
        -max + (x * res) + res,
        max - (y * res) - res,
        3857
    );
    if srid = 3857 then
        return bbox;
    else
        return ST_Transform(bbox, srid);
    end if;
end;
$func$;


-- definition d'une fonction de reprojection dans le format mvt 
create or replace function mvtProject(geom geometry, z int)
    returns geometry
    language plpgsql immutable as
$func$
declare
    max numeric := 20037508.34;
    res numeric := (max*2)/(2^z);
    defi numeric := 4096;
    n numeric := 2^z;
    pi numeric := 3.141592653589793;
    center geometry;
    lon_deg numeric;
    x numeric;
    nxp numeric;
    lat_rad numeric;
    y numeric;
    nyp numeric;
begin
    center := ST_Transform(ST_Centroid(geom),4326);
    lon_deg := ST_X(center);
    x := floor((lon_deg + 180.0) / 360.0 * n);
    lat_rad := radians(ST_Y(center));
    y := floor((1.0 - ln(tan(lat_rad) + (1 / cos(lat_rad))) / pi) / 2.0 * n);
    nxp := floor((ST_X(ST_Transform(ST_Centroid(geom),3857))+ max - (x * res))/res*defi);
    nyp := floor((ST_Y(ST_Transform(ST_Centroid(geom),3857))- max + (y * res)+res)/res*defi);
    return ST_MakePoint(nxp,nyp);
end;
$func$;

-- definition d'une fonction calculant la tile coordinate X ou le centroid d'une geometry est projetée en fonction de z
create or replace function ToTileX (geom geometry, z int)
    returns numeric
    language plpgsql immutable as
$func$
declare
    n numeric := 2^z;
    center geometry;
    lon_deg numeric;
    x numeric;
begin
    center := ST_Transform(ST_Centroid(geom),4326);
    lon_deg := ST_X(center);
    x := floor((lon_deg + 180.0) / 360.0 * n);
    return x;
end;
$func$;

-- definition d'une fonction calculant la tile coordinate Y ou le centroid d'une geometry est projetée en fonction de z
create or replace function ToTileY (geom geometry, z int)
    returns numeric
    language plpgsql immutable as
$func$
declare
    n numeric := 2^z;
    pi numeric := 3.141592653589793;
    center geometry;
    lat_rad numeric;
    y numeric;
begin
    center := ST_Transform(ST_Centroid(geom),4326);
    lat_rad := radians(ST_Y(center));
    y := floor((1.0 - ln(tan(lat_rad) + (1 / cos(lat_rad))) / pi) / 2.0 * n);
    return y;
end;
$func$;

-- definition d'une fonction de creation de grille
CREATE OR REPLACE FUNCTION ST_CreateFishnet(
        nrow integer, ncol integer,
        xsize float8, ysize float8,
        x0 float8 DEFAULT 0, y0 float8 DEFAULT 0,
        OUT "row" integer, OUT col integer,
        OUT geom geometry)
    RETURNS SETOF record AS
$$
SELECT i AS row, j AS col, ST_Translate(cell, j * $3 + $5, i * $4 + $6) AS geom
FROM generate_series(0, $1 - 1) AS i,
     generate_series(0, $2 - 1) AS j,
(
SELECT ('POLYGON((0 0, 0 '||(-1*$4)||', '||$3||' '||(-1*$4)||', '||$3||' 0,0 0))')::geometry AS cell
) AS foo;
$$ LANGUAGE sql IMMUTABLE STRICT;
