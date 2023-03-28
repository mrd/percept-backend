INSERT INTO category_description (category_id, langabbr, description)
SELECT category_id, 'en', $$
Walkability is a measure of how easy and safe it is for people to travel by foot in a given environment. It takes into account factors such as the quality of sidewalks, pedestrian crossings, street connectivity, and access to public amenities. Walkable communities encourage people to walk or use other non-motorized modes of transportation, which can lead to improved physical health, reduced pollution, and increased social interaction.
$$ FROM category WHERE shortname = 'walkability';


INSERT INTO category_description (category_id, langabbr, description)
SELECT category_id, 'en', $$
Pleasantness refers to the degree to which an environment or experience is enjoyable or pleasing to the senses or emotions. It can be influenced by various factors, such as the aesthetics of the surroundings, the quality of the air and lighting, the soundscape, and the presence of other people or natural elements. A pleasant environment can have a positive impact on a person's mood and wellbeing, while an unpleasant environment can have the opposite effect. Therefore, creating a pleasant environment is important in promoting positive experiences and overall quality of life.
$$ FROM category WHERE shortname = 'pleasantness';



INSERT INTO category_description (category_id, langabbr, description)
SELECT category_id, 'en', $$
Greenness refers to the amount of vegetation and greenery in a given environment. It encompasses the presence of trees, shrubs, plants, and other natural elements in urban and suburban settings. The level of greenness in an environment can impact the quality of the air, the temperature, and the overall aesthetic appeal of the space. Greenness also has numerous positive effects on human health and well-being, such as reducing stress, improving mental health, and promoting physical activity. Therefore, incorporating and preserving green spaces in the design and development of urban and suburban areas is crucial for creating sustainable and healthy communities.
$$ FROM category WHERE shortname = 'greenness';



INSERT INTO category_description (category_id, langabbr, description)
SELECT category_id, 'en', $$
Safety refers to the degree of protection from harm or danger. It can be applied to various contexts, including personal safety, workplace safety, and community safety. Safety measures can include physical features such as secure infrastructure, emergency preparedness plans, and safety protocols, as well as social and psychological factors such as trust, communication, and risk awareness. Ensuring safety is essential for maintaining the well-being of individuals and communities, promoting social order, and preventing accidents or harm.
$$ FROM category WHERE shortname = 'safety';



INSERT INTO category_description (category_id, langabbr, description)
SELECT category_id, 'en', $$
Bikeability refers to the degree to which a community or environment is conducive to safe and convenient bicycling as a mode of transportation. This includes factors such as the availability and quality of bike infrastructure, such as bike lanes, paths, and racks, as well as the overall design of streets and intersections to prioritize the safety of cyclists. A bikeable community encourages and facilitates cycling as a sustainable and healthy means of transportation, which can reduce traffic congestion, improve air quality, and promote physical activity.
$$ FROM category WHERE shortname = 'bikeability';


