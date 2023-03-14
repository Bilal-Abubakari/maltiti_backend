<?php

namespace App\Repository;

use App\Entity\Products;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\EntityNotFoundException;
use Doctrine\ORM\NonUniqueResultException;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Products>
 *
 * @method Products|null find($id, $lockMode = null, $lockVersion = null)
 * @method Products|null findOneBy(array $criteria, array $orderBy = null)
 * @method Products[]    findAll()
 * @method Products[]    findBy(array $criteria, array $orderBy = null, $limit = null, $offset = null)
 */
class ProductsRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Products::class);
    }

    public function save(Products $entity, bool $flush = false): void
    {
        $this->getEntityManager()->persist($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

    public function remove(Products $entity, bool $flush = false): void
    {
        $this->getEntityManager()->remove($entity);

        if ($flush) {
            $this->getEntityManager()->flush();
        }
    }

//    /**
//     * @return Products[] Returns an array of Products objects
//     */
//    public function findByExampleField($value): array
//    {
//        return $this->createQueryBuilder('p')
//            ->andWhere('p.exampleField = :val')
//            ->setParameter('val', $value)
//            ->orderBy('p.id', 'ASC')
//            ->setMaxResults(10)
//            ->getQuery()
//            ->getResult()
//        ;
//    }

    /**
     * @throws NonUniqueResultException
     */
    public function findOneBySomeField($value): ?Products
    {
        return $this->createQueryBuilder('p')
            ->andWhere('p.exampleField = :val')
            ->setParameter('val', $value)
            ->getQuery()
            ->getOneOrNullResult()
        ;
    }

    public function setAll($product, $data): void
    {
        $product->setName($data->name);
        $product->setDescription($data->description);
        $product->setCategory($data->category);
        $product->setPrice($data->price);
        $product->setStatus($data->status);
        $product->setImage($data->image);
        $product->setWeight($data->weight);
    }

    /**
     * @param $data
     * @return Products
     */
    public function create($data): Products
    {
        $product = new Products();
        $this->setAll($product, $data);

        $this->_em->persist($product);
        $this->_em->flush();

        return $product;
    }

    /**
     * @throws EntityNotFoundException
     */
    public function edit($data): Products
    {
        $product = $this->find($data->id);

        if (!$product) {
            throw new EntityNotFoundException(
                'Product not found'
            );
        }

        $this->setAll($product, $data);

        return $product;
    }

    /**
     * @throws EntityNotFoundException
     */
    public function delete(int $id): Products
    {
        $product = $this->find($id);
        if (!$product) {
            throw new EntityNotFoundException(
                'Product not found'
            );
        }
        $this->_em->remove($product);
        $this->_em->flush();

        return $product;
    }

    public function getProducts(): array
    {
        return $this->findAll();
    }

}
