# Marching Cubes



## Authors
- Conor O'Malley
- [Nick Stuhldreher](https://www.nickst.dev/)

## Styling

[Color Pallete](https://coolors.co/2c1606-d38d0a-fbda7f-db162f-5f758e)

## Possibe Methods

Store Int 3d Texture where bits represent if a corner is inside or outside the volume. In Terrain Generation, run comp shader on each grid point and use atomics to set the bits. Then run marching cubes on the texture.

OR

Run comp shader on each grid cell* and check if corners are in or out of volume (work is repeated). Then run marching cubes on the texture. 

If terrain generation is slow, then have it in its own pass and store to a texture (store grid points)

## Pipelines & Needed Resources

0. Noise Field Creation

    - (Output) array\<bool> GridPoints in Volume

1. Marching Cubes (Triangle Creation)

    - (Input) array\<bool> GridPoints in Volume
    - (Output) array\<Vertex> Triangles

`Maybe have a compute shader that converts triangle list to vertex buffer and index buffer (then use triangle stip to render, otherwise just render out the triangle buffer with triangle list). `

`If there is N triangles, latter method is 72 * N bytes (4*3*3 for positions, 4*3*3 for normals). 72MB for 1 million triangles. First method (ideal case where every vertex is used once in the strip) is 28 * N bytes (4*3 for positions, 4*3 for normals, 4 for index). 24MB for 1 million triangles.`

2. Rasterization and Rendering

    - (Vertex Input) array\<Vertex> Triangles


**BindGroups Overview**

Bolded BindGroups need to have their layour updated (and their binding).
Italicized BindGroups only need their binding updated.

| Stage | BindGroup 1 | BindGroup 2 | BindGroup 3 | BindGroup 4|
| --- | --- | --- | --- | --- |
| | | | | |
| | | | | |
