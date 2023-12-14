# Marching Cubes

## Authors
- Conor O'Malley
- [Nick Stuhldreher](https://www.nickst.dev/)


## Pipelines & Needed Resources

0. Noise Field Creation

    - (Input) Noise Settings Buffer
    - (Output)  texture3d\<float> GridPoint Values

1. Marching Cubes (Triangle Creation)

    - (Input) texture3d\<float> GridPoint Values
    - (Input) Settings Buffer
    - (Input) Triangulation LUT Buffer
    - (Input / Output) Storage Buffer for Indices
    - (Input / Output) Storage Buffer for Indirect Args
    - (Input / Output) Storage Buffer for Vertices

2. Rasterization and Rendering

    - (Vertex Input) Vertex Buffer (position, normal)
    - (Input) Render Settings
    - (Index Input) Index Buffer

## TODO
```
- support window and resolution resizing during runtime (done)
- translate the noise and the mesh based on position, so that we have an endless space, shouldnt affect performance at all (done)
- add some procedural / interesting coloring / texturing (done)
- add this one fps counter library that is really clean looking (done)
- add additional sim settings (done)
- store vertex buffers as seperate, so that they can be packed tightly (done)
- add debug timing info (done)
- setup auto build
```

## Final Notes
Ended up a bit more spaghetti'd than I'd like, but happy with the current state of it. Could gain some efficiency via frustrum culling or maybe rendering the noise offset by where the player is looking. The JavaScript object oriented style got a bit messy in the end, but it was a fun project to work on.

## BindGroups Overview
|                | BindGroup 0                          | BindGroup 1                                                                 | BindGroup 2  | BindGroup 3 |
|----------------|--------------------------------------|-----------------------------------------------------------------------------|--------------|-------------|
| Compute Noise  | Camera Info + Noise Storage Texture  | Noise Settings                                                              |              |             |
| Marching Cubes | Camera Info + Noise Storage Texture  | Marching Cube Settings + IndirectArgs + Vertex, Normal, Index Buffers, LUTs |              |             |
| Compute Noise  | Camera Info + Noise Storage Texture  | Noise Settings                                                              |              |             |
| Rendering      | Camera Info + Noise Storage Texture  |                                                                             |              |             |