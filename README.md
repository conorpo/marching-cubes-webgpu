# Marching Cubes



## Authors
- Conor O'Malley
- [Nick Stuhldreher](https://www.nickst.dev/)
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

    - (Output)  array\<int> GridPoint Values

1. Marching Cubes (Triangle Creation)

    - (Input) array\<int> GridPoint Values
    - (Input) Settings Struct
    - (Input) Storage Buffer for Atomics
    - (Output) array\<Vertex> Verts (positions and normals)
    - (Output) array\<int> Indices

2. Rasterization and Rendering

    - (Vertex Input) array\<Vertex> Triangles


**BindGroups Overview**

Bolded BindGroups need to have their layour updated (and their binding).
Italicized BindGroups only need their binding updated.

| Stage | BindGroup 1 | BindGroup 2 | BindGroup 3 | BindGroup 4|
| --- | --- | --- | --- | --- |
| | | | | |
| | | | | |