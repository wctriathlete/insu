-- supabase/migrations/20261107000001_sereno_naming.sql
-- Sereno redesign (handoff §7.2): store contract names as translatable parts
-- instead of one free-text title, and remember each person's UI language.
--
-- Additive only. `contracts.title` stays (admin, Stripe metadata, audit logs);
-- the UI stops showing it. The app derives every new field when it is NULL
-- (lib/contracts/display.ts), so this can be applied before or after deploy.

-- 1. Corridor route name: a place name, never translated.
alter table corridors add column if not exists route_name text;

update corridors
set route_name = btrim(regexp_replace(name, '\s*\((Mañana|Tarde)\)\s*$', ''))
where route_name is null;

-- 2. City slug for the two live markets (translated via messages).
alter table contracts add column if not exists city_slug text
  check (city_slug in ('cdmx', 'guatemala_city'));

update contracts
set city_slug = case
  when location->>'country' = 'MX' and lower(location->>'city') in ('mexico city', 'cdmx') then 'cdmx'
  when location->>'country' = 'GT' then 'guatemala_city'
end
where city_slug is null;

-- 3. Per-locale names + descriptions. Used for products without a structured
--    name (coming soon); traffic/air/flood/fuel names come from messages.
alter table contracts add column if not exists name_es text;
alter table contracts add column if not exists name_en text;
alter table contracts add column if not exists description_es text;
alter table contracts add column if not exists description_en text;

-- Coming-soon catalog: names, never questions (handoff §7.2 rules).
update contracts set
  name_es = 'Ola de calor en Los Cabos',
  name_en = 'Los Cabos heatwave',
  description_es = 'Te pagaría si la temperatura en Cabo San Lucas pasa de 40 °C en temporada alta.',
  description_en = 'Would pay you if the temperature in Cabo San Lucas goes above 40 °C during peak season.'
where slug = 'cabo-heatwave';

update contracts set
  name_es = 'Corte de agua en Bogotá',
  name_en = 'Water cut in Bogotá',
  description_es = 'Te pagaría si el agua se corta en tu zona de Bogotá por 6 horas o más.',
  description_en = 'Would pay you if the water supply in your part of Bogotá is cut for 6 hours or more.'
where slug = 'bogota-water-shortage';

update contracts set
  name_es = 'Apagón en Buenos Aires',
  name_en = 'Buenos Aires blackout',
  description_es = 'Te pagaría si un apagón grande en Buenos Aires dura 3 horas o más.',
  description_en = 'Would pay you if a major blackout in Buenos Aires lasts 3 hours or more.'
where slug = 'buenos-aires-blackout';

update contracts set
  name_es = 'Sargazo en la playa',
  name_en = 'Sargassum beach closure',
  description_es = 'Te pagaría si cierran las playas de la zona hotelera de Cancún por sargazo.',
  description_en = 'Would pay you if Cancún hotel-zone beaches close because of sargassum.'
where slug = 'cancun-beach-closure';

update contracts set
  name_es = 'Inundación del Amazonas en Manaos',
  name_en = 'Amazon flood in Manaus',
  description_es = 'Te pagaría si se declara alerta de inundación del río Amazonas en Manaos.',
  description_en = 'Would pay you if an Amazon River flood alert is declared in Manaus.'
where slug = 'amazon-flood-alert';

update contracts set
  name_es = 'Metro detenido en São Paulo',
  name_en = 'São Paulo metro shutdown',
  description_es = 'Te pagaría si una línea del metro de São Paulo se detiene una hora o más en hora pico.',
  description_en = 'Would pay you if a São Paulo metro line stops for an hour or more at rush hour.'
where slug = 'sao-paulo-metro-shutdown';

update contracts set
  name_es = 'Huracán en el Caribe mexicano',
  name_en = 'Mexican Caribbean hurricane',
  description_es = 'Te pagaría si un huracán categoría 3 o más toca tierra en la costa del Caribe mexicano.',
  description_en = 'Would pay you if a category 3+ hurricane makes landfall on the Mexican Caribbean coast.'
where slug = 'caribbean-hurricane-landfall';

update contracts set
  name_es = 'Poca nieve en Whistler',
  name_en = 'Low snow in Whistler',
  description_es = 'Te pagaría si en Whistler caen menos de 20 cm de nieve.',
  description_en = 'Would pay you if Whistler gets less than 20 cm of snow.'
where slug = 'whistler-snow-20cm';

update contracts set
  name_es = 'Lluvia torrencial en Guadalajara',
  name_en = 'Guadalajara flash flood',
  description_es = 'Te pagaría si en Guadalajara llueven más de 40 mm en 24 horas.',
  description_en = 'Would pay you if Guadalajara gets more than 40 mm of rain in 24 hours.'
where slug = 'guadalajara-flash-flood';

-- Settled legacy one-time contracts (still reachable from old positions).
update contracts set name_es = 'Contingencia ambiental en CDMX', name_en = 'Mexico City air contingency'
where slug = 'cdmx-air-quality-alert';

update contracts set name_es = 'Apagón de más de 2 horas en CDMX', name_en = 'Mexico City power cut over 2 hours'
where slug = 'power-outage-cdmx-2h';

-- 4. UI language, mirrored from the NEXT_LOCALE cookie so it follows the
--    person to a new device. NULL = never chosen (default Spanish).
alter table profiles add column if not exists preferred_locale text
  check (preferred_locale in ('es', 'en'));
